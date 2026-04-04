import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: productId } = await params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        category: true,
        price: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const [sameCategory, priceRange, topRated] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { not: productId },
          category: product.category,
          stock: { gt: 0 },
        },
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
        take: limit,
      }),
      prisma.product.findMany({
        where: {
          id: { not: productId },
          price: {
            gte: Math.max(0, product.price - 2000),
            lte: product.price + 2000,
          },
          stock: { gt: 0 },
        },
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
        take: limit,
      }),
      prisma.product.findMany({
        where: {
          id: { not: productId },
          averageRating: { gte: 3 },
          stock: { gt: 0 },
        },
        orderBy: { averageRating: 'desc' },
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
        take: limit,
      }),
    ])

    const related = sameCategory.slice(0, limit)
    const alsoBought = priceRange
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, limit)
    const recommended = topRated.slice(0, limit)

    return NextResponse.json({
      related,
      alsoBought,
      recommended,
    })
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}