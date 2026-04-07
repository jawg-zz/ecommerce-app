import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
  const viewedIds = searchParams.get('viewedIds')?.split(',').filter(Boolean) || []

  try {
    if (categories.length === 0) {
      const topRated = await prisma.product.findMany({
        where: { stock: { gt: 0 } },
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
      })

      return NextResponse.json({ products: topRated })
    }

    const [sameCategory, differentCategory] = await Promise.all([
      prisma.product.findMany({
        where: {
          category: { in: categories },
          id: { notIn: viewedIds },
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
      prisma.product.findMany({
        where: {
          id: { notIn: viewedIds },
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

    const recommended = sameCategory.length > 0 ? sameCategory : differentCategory.slice(0, limit)

    return NextResponse.json({ products: recommended.slice(0, limit) })
  } catch (error) {
    console.error('Failed to fetch homepage recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}