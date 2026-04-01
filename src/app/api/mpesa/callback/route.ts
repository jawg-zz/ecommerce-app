import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logInfo, logError } from '@/lib/logger'
import { logCallbackError } from '@/lib/errors'
import { clearCart } from '@/lib/cart'
import { cancelPaymentCheck } from '@/lib/queue'

const SAFARICOM_IPS = new Set([
  '196.201.214.200',
  '196.201.214.201',
  '196.201.214.202',
  '196.201.214.203',
  '196.201.214.204',
  '196.201.214.205',
  '196.201.214.206',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.0/24',
  '196.201.214.0/24',
])

function isAllowedIP(ip: string | null): boolean {
  if (!ip) return false
  
  if (SAFARICOM_IPS.has(ip)) return true
  
  for (const cidr of SAFARICOM_IPS) {
    if (cidr.includes('/')) {
      const [base, bits] = cidr.split('/')
      const mask = ~(2 ** (32 - parseInt(bits)) - 1)
      const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
      const baseNum = base.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
      if ((ipNum & mask) === (baseNum & mask)) return true
    }
  }
  
  return false
}

/**
 * M-Pesa callback endpoint
 * Safaricom sends payment results here
 */
export async function POST(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || null

  const ipWhitelistEnabled = process.env.MPESA_IP_WHITELIST !== 'false'
  if (ipWhitelistEnabled && !isAllowedIP(clientIP)) {
    logError('Unauthorized M-Pesa callback - IP not allowed', {
      ip: clientIP || 'unknown'
    })
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { Body } = body
    const { stkCallback } = Body

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback

    logInfo('M-Pesa callback received', {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      ip: clientIP,
    })

    const order = await prisma.order.findFirst({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
    })

    if (!order) {
      logError('Order not found for CheckoutRequestID', { CheckoutRequestID })
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (order.status === 'PAID') {
      logInfo('Order already paid', { orderId: order.id, CheckoutRequestID })
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (order.status === 'CANCELLED') {
      logInfo('Order already cancelled, ignoring callback', { orderId: order.id, CheckoutRequestID })
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (ResultCode === 0) {
      const metadata = CallbackMetadata?.Item || []
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value

      const receivedAmount = Number(amount)
      const expectedAmount = Number(order.total)
      const tolerance = expectedAmount * 0.01
      
      if (!amount || receivedAmount <= 0 || Math.abs(receivedAmount - expectedAmount) > tolerance) {
        logError('Payment amount mismatch', {
          orderId: order.id,
          expected: expectedAmount,
          received: receivedAmount,
          tolerance: tolerance,
        })
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      const orderWithItems = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          mpesaCheckoutRequestId: CheckoutRequestID,
          reference: mpesaReceiptNumber,
        },
        include: {
          user: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      await clearCart(order.userId)

      await cancelPaymentCheck(order.id)

      logInfo('Publishing payment status to Redis', { orderId: order.id, status: 'success' })
      await redis.publish(`payment-status:${order.id}`, JSON.stringify({
        status: 'success',
        orderId: order.id,
        message: 'Payment confirmed',
      })).catch(err => logError('Redis publish failed', { error: String(err), orderId: order.id }))
      logInfo('Redis publish complete', { orderId: order.id })

      logInfo('ORDER CONFIRMATION - Payment successful', {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8),
        amount: order.total,
        amountPaid: Number(amount),
        mpesaReceiptNumber,
        customerPhone: phoneNumber,
        customerName: orderWithItems.user.name,
        customerEmail: orderWithItems.user.email,
        items: orderWithItems.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
        })),
        totalItems: orderWithItems.items.reduce((sum, item) => sum + item.quantity, 0),
      })
      
      // TODO: Integrate with email/SMS service to send order confirmation
      // - Send email to customer with order details
      // - Send SMS notification with order summary
    } else {
      const orderWithItems = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
        include: { items: true },
      })

      for (const item of orderWithItems.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }

      logInfo('Payment failed - stock restored', {
        orderId: order.id,
        ResultCode,
        ResultDesc,
      })

      await cancelPaymentCheck(order.id)

      logInfo('Publishing payment status to Redis', { orderId: order.id, status: 'cancelled' })
      await redis.publish(`payment-status:${order.id}`, JSON.stringify({
        status: 'cancelled',
        orderId: order.id,
        message: ResultDesc || 'Payment cancelled by user',
      })).catch(err => logError('Redis publish failed', { error: String(err), orderId: order.id }))
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    logError('M-Pesa callback error', { error: String(error), ip: clientIP })
    logCallbackError(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
