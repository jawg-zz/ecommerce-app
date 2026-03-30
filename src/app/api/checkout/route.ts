import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { initiateSTKPush, querySTKStatus } from '@/lib/mpesa'
import { logError } from '@/lib/logger'
import { checkoutRateLimiter } from '@/lib/ratelimit'

const checkoutSchema = z.object({
  phoneNumber: z.string().regex(/^(254[17]\d{8}|0[17]\d{8})$/, 'Invalid phone number format (use 0712345678 or 254712345678)'),
  shippingAddress: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
})

// POST: Initiate M-Pesa payment
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit checkout attempts
  const { success } = await checkoutRateLimiter.limit(user.id)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a moment.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { phoneNumber, shippingAddress } = checkoutSchema.parse(body)

    const cart = await getCart(user.id)

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Stock reservation with row-level locking to prevent race conditions
    const order = await prisma.$transaction(async (tx) => {
      // Use FOR UPDATE to lock rows and prevent concurrent checkouts
      for (const item of cart.items) {
        const product = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
          SELECT id, stock FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `
        
        if (!product[0] || product[0].stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}`)
        }
      }
      
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          total: cart.total,
          shippingAddress,
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      })
    })

    // Initiate M-Pesa STK Push
    const { checkoutRequestId } = await initiateSTKPush(
      phoneNumber,
      cart.total,
      order.id
    )

    // Store checkoutRequestId in order for tracking
    await prisma.order.update({
      where: { id: order.id },
      data: { mpesaCheckoutRequestId: checkoutRequestId },
    })

    return NextResponse.json({
      orderId: order.id,
      checkoutRequestId,
      amount: cart.total,
      message: 'Check your phone for M-Pesa payment prompt',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    logError('Checkout error', { error: String(error) })
    
    // Don't expose internal error details to users
    return NextResponse.json(
      { error: 'Payment initiation failed. Please try again.' },
      { status: 500 }
    )
  }
}

// GET: Check payment status
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: user.id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ status: 'success', order })
    }

    if (!order.mpesaCheckoutRequestId) {
      return NextResponse.json({ status: 'pending' })
    }

    // Query M-Pesa status
    const paymentStatus = await querySTKStatus(order.mpesaCheckoutRequestId)

    if (paymentStatus.status === 'success') {
      // Update order and reduce stock atomically in transaction
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
          include: {
            items: true,
          },
        })

        // Reduce stock atomically
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }

        return order
      })

      // Clear cart
      await clearCart(user.id)

      return NextResponse.json({ status: 'success', order: updatedOrder })
    }

    return NextResponse.json({ 
      status: paymentStatus.status,
      message: paymentStatus.status === 'failed' ? 'Payment failed. Please try again.' : 'Payment pending'
    })
  } catch (error) {
    logError('Payment status check error', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
