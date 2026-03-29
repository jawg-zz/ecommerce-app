import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

/**
 * M-Pesa callback endpoint
 * Safaricom sends payment results here
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // M-Pesa callback structure
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
    })

    // Find order by CheckoutRequestID
    const order = await prisma.order.findFirst({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
    })

    if (!order) {
      logError('Order not found for CheckoutRequestID', { CheckoutRequestID })
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // ResultCode 0 = success
    if (ResultCode === 0) {
      // Extract payment details from metadata
      const metadata = CallbackMetadata?.Item || []
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value

      // Validate payment amount matches order total
      if (amount && Number(order.total) !== Number(amount)) {
        logError('Payment amount mismatch', {
          orderId: order.id,
          expected: order.total,
          received: amount,
        })
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      // Use transaction for atomic update and stock reduction
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            mpesaCheckoutRequestId: CheckoutRequestID,
            reference: mpesaReceiptNumber,
          },
        })

        // Reduce stock atomically
        const orderWithItems = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        })

        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            })
          }
        }
      })

      logInfo('Payment successful', {
        orderId: order.id,
        amount,
        mpesaReceiptNumber,
        phoneNumber,
      })
    } else {
      // Payment failed or cancelled
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

    // Always return success to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    logError('M-Pesa callback error', { error: String(error) })
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
