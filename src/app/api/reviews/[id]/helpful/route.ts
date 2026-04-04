import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: reviewId } = await params
  
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpful: { increment: 1 },
      },
    })

    return NextResponse.json({ helpful: updatedReview.helpful })
  } catch (error) {
    console.error('Failed to mark review as helpful:', error)
    return NextResponse.json(
      { error: 'Failed to mark review as helpful' },
      { status: 500 }
    )
  }
}