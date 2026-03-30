import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getCart, addToCart, updateCartItem, clearCart } from '@/lib/cart'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
})

const updateCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
})

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ items: [], total: 0 })
  }

  const cart = await getCart(user.id)
  return NextResponse.json(cart)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, quantity } = addToCartSchema.parse(body)

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${product.stock} items available` },
        { status: 400 }
      )
    }

    await addToCart(user.id, productId, quantity)
    const cart = await getCart(user.id)

    return NextResponse.json(cart)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    logError('Add to cart error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to add item to cart. Please try again.' },
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
    const { productId, quantity } = updateCartSchema.parse(body)

    if (quantity > 0) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      if (product.stock < quantity) {
        return NextResponse.json(
          { error: `Only ${product.stock} items available` },
          { status: 400 }
        )
      }
    }

    await updateCartItem(user.id, productId, quantity)
    const cart = await getCart(user.id)

    return NextResponse.json(cart)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    logError('Update cart error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to update cart. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await clearCart(user.id)
  return NextResponse.json({ items: [], total: 0 })
}
