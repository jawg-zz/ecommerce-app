import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true },
  })

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const cached = await redis.get(`payment-final:${orderId}`)
  if (cached) {
    const data = JSON.parse(cached)
    return NextResponse.json(data)
  }

  return NextResponse.json({ status: order.status.toLowerCase() })
}
