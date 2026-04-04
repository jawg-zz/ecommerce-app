import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: orderId } = await params

  try {
    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Failed to fetch order timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order timeline' },
      { status: 500 }
    )
  }
}