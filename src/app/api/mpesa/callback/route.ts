import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    console.log('M-Pesa callback received:', {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    })

    // Find order by CheckoutRequestID
    const order = await prisma.order.findFirst({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
    })

    if (!order) {
      console.error('Order not found for CheckoutRequestID:', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // ResultCode 0 = success
    if (ResultCode === 0) {
      // Extract payment details from metadata
      const metadata = CallbackMetadata?.Item || []
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value

      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          mpesaCheckoutRequestId: CheckoutRequestID,
          reference: mpesaReceiptNumber,
        },
      })

      // Reduce stock
      const orderWithItems = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      })

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      console.log('Payment successful:', {
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

      console.log('Payment failed:', {
        orderId: order.id,
        ResultCode,
        ResultDesc,
      })
    }

    // Always return success to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('M-Pesa callback error:', error)
    // Still return success to avoid retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
