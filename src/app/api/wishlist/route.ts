import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const products = items
      .filter((item) => item.product !== null)
      .map((item) => item.product)

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

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
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            category: true,
            stock: true,
          },
        },
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

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  try {
    if (productId) {
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
    } else {
      await prisma.wishlistItem.deleteMany({
        where: { userId: user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}