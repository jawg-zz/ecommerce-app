import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: productId } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        category: true,
        stock: true,
        averageRating: true,
        reviewCount: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to get product for wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to get product' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { id: productId } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 409 }
      )
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to add to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { id: productId } = await params

  try {
    const item = await prisma.wishlistItem.findFirst({
      where: {
        userId: user.id,
        productId,
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      )
    }

    await prisma.wishlistItem.delete({
      where: { id: item.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}