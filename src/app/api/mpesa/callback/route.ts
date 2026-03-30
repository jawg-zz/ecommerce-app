import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

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
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || null

  const callbackSecret = process.env.MPESA_CALLBACK_SECRET
  const authHeader = request.headers.get('authorization')
  
  if (callbackSecret && authHeader !== `Bearer ${callbackSecret}`) {
    logError('Unauthorized M-Pesa callback - invalid secret', {
      ip: clientIP || 'unknown'
    })
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unauthorized' }, { status: 401 })
  }

  const ipWhitelistEnabled = process.env.MPESA_IP_WHITELIST === 'true'
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

    if (ResultCode === 0) {
      const metadata = CallbackMetadata?.Item || []
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value

      if (amount && Number(order.total) !== Number(amount)) {
        logError('Payment amount mismatch', {
          orderId: order.id,
          expected: order.total,
          received: amount,
        })
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      await prisma.$transaction(async (tx) => {
        const orderWithItems = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            mpesaCheckoutRequestId: CheckoutRequestID,
            reference: mpesaReceiptNumber,
          },
          include: { items: true },
        })

        if (orderWithItems && orderWithItems.items.length > 0) {
          await Promise.all(
            orderWithItems.items.map(item =>
              tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              })
            )
          )
        }
      })

      logInfo('Payment successful', {
        orderId: order.id,
        amount,
        mpesaReceiptNumber,
        phoneNumber,
      })
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })

      logInfo('Payment failed', {
        orderId: order.id,
        ResultCode,
        ResultDesc,
      })
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    logError('M-Pesa callback error', { error: String(error), ip: clientIP })
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
