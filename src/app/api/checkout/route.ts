import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/stripe'

const checkoutSchema = z.object({
  shippingAddress: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { shippingAddress } = checkoutSchema.parse(body)

    const cart = await getCart(user.id)

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.product.name}` },
          { status: 400 }
        )
      }
    }

    const paymentIntent = await createPaymentIntent(cart.total, {
      userId: user.id,
      shippingAddress: JSON.stringify(shippingAddress),
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: cart.total,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { paymentIntentId, shippingAddress } = body

    const cart = await getCart(user.id)

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const orderItems = cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    }))

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PAID',
        total: cart.total,
        stripePaymentId: paymentIntentId,
        shippingAddress,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    for (const item of cart.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })
    }

    await clearCart(user.id)

    return NextResponse.json({
      ...order,
      total: order.total.toNumber(),
      items: order.items.map(item => ({
        ...item,
        price: item.price.toNumber(),
        product: {
          ...item.product,
          price: item.product.price.toNumber(),
        },
      })),
    })
  } catch (error) {
    console.error('Complete checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
