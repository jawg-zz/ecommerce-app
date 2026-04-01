import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { initiateSTKPush } from '@/lib/mpesa'
import { logError } from '@/lib/logger'
import { logCheckoutError, logPaymentError } from '@/lib/errors'
import { checkoutRateLimiter } from '@/lib/ratelimit'
import { schedulePaymentCheck } from '@/lib/queue'

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

    // Verify current stock levels before checkout (items might have changed since added to cart)
    const productIds = cart.items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true },
    })
    
    const productMap = new Map(products.map(p => [p.id, p]))
    const outOfStockItems: string[] = []
    
    for (const item of cart.items) {
      const product = productMap.get(item.productId)
      if (!product) {
        outOfStockItems.push(`${item.productId} (no longer available)`)
      } else if (product.stock < item.quantity) {
        outOfStockItems.push(`${product.name} (only ${product.stock} available)`)
      }
    }
    
    if (outOfStockItems.length > 0) {
      return NextResponse.json({ 
        error: 'Some items in your cart are no longer available',
        outOfStock: outOfStockItems
      }, { status: 400 })
    }

    // Check for existing pending order for this user within a reasonable timeframe (5 minutes)
    const RECENT_ORDER_THRESHOLD_MS = 5 * 60 * 1000
    const existingPendingOrder = await prisma.order.findFirst({
      where: { 
        userId: user.id,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - RECENT_ORDER_THRESHOLD_MS) },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (existingPendingOrder && existingPendingOrder.mpesaCheckoutRequestId) {
      // Verify the order still has valid items in cart
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: existingPendingOrder.id },
      })
      
      const orderItemMap = new Map(orderItems.map(i => [i.productId, i.quantity]))
      const cartItemMap = new Map(cart.items.map(i => [i.productId, i.quantity]))
      
      // Check if cart still matches order items
      let cartMatchesOrder = true
      for (const [productId, qty] of orderItemMap) {
        if (cartItemMap.get(productId) !== qty) {
          cartMatchesOrder = false
          break
        }
      }
      if (orderItemMap.size !== cartItemMap.size) cartMatchesOrder = false
      
      if (cartMatchesOrder) {
        return NextResponse.json({
          orderId: existingPendingOrder.id,
          checkoutRequestId: existingPendingOrder.mpesaCheckoutRequestId,
          amount: cart.total,
          message: 'Existing payment in progress',
        })
      }
    }

    // Stock reservation with row-level locking to prevent race conditions
    // Note: Stock has already been validated above, so this is just a safety check
    
    const order = await prisma.$transaction(async (tx) => {
      // Sort by product ID to ensure consistent locking order and prevent deadlocks
      const sortedItems = [...cart.items].sort((a, b) => a.productId.localeCompare(b.productId))
      
      // Lock each product row sequentially to prevent race conditions and deadlocks
      for (const item of sortedItems) {
        const [product] = await tx.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
          SELECT id, name, stock FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `
        
        if (!product || product.stock < item.quantity) {
          throw new Error('STOCK_CHANGED: Stock changed during checkout. Please try again.')
        }
      }
      
      // All stock available - reserve it
      for (const item of sortedItems) {
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

    let checkoutRequestId: string
    try {
      const result = await initiateSTKPush(
        phoneNumber,
        cart.total,
        order.id
      )
      checkoutRequestId = result.checkoutRequestId
    } catch (stkError) {
      logError('STK Push failed, rolling back order', { error: String(stkError), orderId: order.id })
      
      await prisma.$transaction(async (tx) => {
        const orderWithItems = await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
          include: { items: true },
        })

        for (const item of orderWithItems.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      })

      logError('Stock restored after STK Push failure', { orderId: order.id })
      throw stkError
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { mpesaCheckoutRequestId: checkoutRequestId },
      })
    })

    // Schedule delayed job to check payment status if callback doesn't arrive
    await schedulePaymentCheck(order.id, 120000) // 2 minutes

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
    
    if (error instanceof Error && error.message.startsWith('STOCK_CHANGED:')) {
      return NextResponse.json(
        { error: 'Stock changed during checkout. Please try again.' },
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

    // Just return current order status from DB - no M-Pesa query needed
    // Frontend can call this on user action to check status
    if (order.status === 'PENDING') {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for payment confirmation'
      })
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ 
        status: 'cancelled',
        message: 'Order was cancelled'
      })
    }

    return NextResponse.json({ status: order.status.toLowerCase(), order })
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
