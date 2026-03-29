import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { initiateSTKPush, querySTKStatus } from '@/lib/mpesa'

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

  try {
    const body = await request.json()
    const { phoneNumber, shippingAddress } = checkoutSchema.parse(body)

    const cart = await getCart(user.id)

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Check stock and reserve it atomically
    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })
        
        if (!product || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}`)
        }
      }
      
      // Create pending order with stock reserved
      return await tx.order.create({
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
    console.error('Checkout error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    // Check for M-Pesa specific error codes
    const mpesaErrorMatch = errorMessage.match(/M-Pesa.*?:\s*(\d+)/)
    const errorCode = mpesaErrorMatch ? mpesaErrorMatch[1] : undefined
    
    return NextResponse.json(
      { error: errorMessage, errorCode },
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
      // Update order and reduce stock
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
        include: {
          items: {
            include: { product: true },
          },
        },
      })

      // Reduce stock
      for (const item of updatedOrder.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Clear cart
      await clearCart(user.id)

      return NextResponse.json({ status: 'success', order: updatedOrder })
    }

    return NextResponse.json({ 
      status: paymentStatus.status,
      errorCode: paymentStatus.resultCode,
      message: paymentStatus.resultDesc 
    })
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
