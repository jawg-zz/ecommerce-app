import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: reviewId } = await params
  
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true },
        },
      },
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Failed to fetch review:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { id: reviewId } = await params

  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { rating, title, content, photos } = body

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (rating !== undefined) updateData.rating = rating
    if (title !== undefined) updateData.title = title?.trim() || null
    if (content !== undefined) updateData.content = content?.trim() || null
    if (photos !== undefined) updateData.photos = photos

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    const stats = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: true,
    })

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        averageRating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Failed to update review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
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

  const { id: reviewId } = await params

  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      )
    }

    const productId = existingReview.productId

    await prisma.review.delete({
      where: { id: reviewId },
    })

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}