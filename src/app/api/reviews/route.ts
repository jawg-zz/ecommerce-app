import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const sort = searchParams.get('sort') || 'newest' // newest, oldest, highest, lowest, helpful
  const rating = searchParams.get('rating')

  if (!productId) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    )
  }

  let orderBy: Record<string, string> = { createdAt: 'desc' }
  switch (sort) {
    case 'oldest':
      orderBy = { createdAt: 'asc' }
      break
    case 'highest':
      orderBy = { rating: 'desc' }
      break
    case 'lowest':
      orderBy = { rating: 'asc' }
      break
    case 'helpful':
      orderBy = { helpful: 'desc' }
      break
  }

  const where: Record<string, unknown> = { productId }
  if (rating) {
    where.rating = parseInt(rating)
  }

  try {
    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
    ])

    // Calculate rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: true,
    })

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count
    })

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
        distribution,
      },
    })
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
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
    const { productId, rating, title, content, photos } = body

    if (!productId || !rating) {
      return NextResponse.json(
        { error: 'Product ID and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: user.id,
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    // Check if user purchased this product (for verified badge)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: user.id,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        },
      },
    })

    // Create the review
    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.id,
        rating,
        title: title?.trim() || null,
        content: content?.trim() || null,
        photos: photos || [],
        verified: !!hasPurchased,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    // Update product's average rating and review count
    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    })

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Failed to create review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}