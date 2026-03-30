import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { initiateSTKPush, querySTKStatus } from '@/lib/mpesa'
import { logError } from '@/lib/logger'
import { logCheckoutError, logPaymentError } from '@/lib/errors'
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

    const existingPendingOrder = await prisma.order.findFirst({
      where: { 
        userId: user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (existingPendingOrder && existingPendingOrder.mpesaCheckoutRequestId) {
      return NextResponse.json({
        orderId: existingPendingOrder.id,
        checkoutRequestId: existingPendingOrder.mpesaCheckoutRequestId,
        amount: cart.total,
        message: 'Existing payment in progress',
      })
    }

    // Stock reservation with row-level locking to prevent race conditions
    const outOfStockItems: string[] = []
    
    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        // Use FOR UPDATE to lock the row and prevent concurrent checkouts
        const [product] = await tx.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
          SELECT id, name, stock FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `
        
        if (!product) {
          outOfStockItems.push(`${item.productId} (not found)`)
        } else if (product.stock < item.quantity) {
          outOfStockItems.push(`${product.name} (${product.stock} available, ${item.quantity} requested)`)
        }
      }
      
      // Check if any items are out of stock before proceeding
      if (outOfStockItems.length > 0) {
        throw new Error('OUT_OF_STOCK:' + outOfStockItems.join(';'))
      }
      
      // All stock available - reserve it
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
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
      
      return newOrder
    })

    // Initiate M-Pesa STK Push
    const { checkoutRequestId } = await initiateSTKPush(
      phoneNumber,
      cart.total,
      order.id
    )

    // Update checkoutRequestId in same transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { mpesaCheckoutRequestId: checkoutRequestId },
      })
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
    
    if (error instanceof Error && error.message.startsWith('OUT_OF_STOCK:')) {
      const outOfStockItems = error.message.replace('OUT_OF_STOCK:', '').split(';')
      return NextResponse.json(
        { 
          error: 'Some items are out of stock or have insufficient quantity',
          outOfStock: outOfStockItems
        },
        { status: 400 }
      )
    }
    
    logError('Checkout error', { error: String(error) })
    logCheckoutError(error instanceof Error ? error : new Error(String(error)), user.id)
    
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

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  try {
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

    // Check for payment timeout (10 minutes)
    const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000
    const orderAge = Date.now() - new Date(order.createdAt).getTime()
    
    if (orderAge > PAYMENT_TIMEOUT_MS && order.status === 'PENDING') {
      await prisma.$transaction(async (tx) => {
        const cancelledOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
          include: { items: true },
        })

        for (const item of cancelledOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      })

      await clearCart(user.id)

      return NextResponse.json({ 
        status: 'timeout',
        message: 'Payment timed out. Your order has been cancelled and stock restored. Please try again.'
      })
    }

    // Query M-Pesa status
    const paymentStatus = await querySTKStatus(order.mpesaCheckoutRequestId)

    if (paymentStatus.status === 'success') {
      // Update order status - stock was already reserved during checkout
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
          include: {
            items: true,
          },
        })

        return order
      })

      // Clear cart
      await clearCart(user.id)

      return NextResponse.json({ status: 'success', order: updatedOrder })
    }

    // If payment failed, restore the reserved stock
    if (paymentStatus.status === 'failed') {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
          include: { items: true },
        })

        // Restore stock for each item
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      })
    }

    return NextResponse.json({ 
      status: paymentStatus.status,
      message: paymentStatus.status === 'failed' ? 'Payment failed. Please try again.' : 'Payment pending'
    })
  } catch (error) {
    logError('Payment status check error', { error: String(error), orderId })
    logPaymentError(error instanceof Error ? error : new Error(String(error)), orderId, user.id)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}

// DELETE: Cancel payment and restore stock
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: user.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot cancel paid order' }, { status: 400 })
    }

    // Restore stock and cancel order
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      })

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    return NextResponse.json({ message: 'Payment cancelled and stock restored' })
  } catch (error) {
    logError('Payment cancellation error', { error: String(error), orderId })
    logPaymentError(error instanceof Error ? error : new Error(String(error)), orderId || '', user.id)
    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 }
    )
  }
}
