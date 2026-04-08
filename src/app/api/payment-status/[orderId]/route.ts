import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // Allow guest checkout - verify order exists without requiring auth
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { status: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const status = order.status.toLowerCase()

  // If payment is not pending, try to get detailed error info from Redis
  if (status !== 'pending') {
    try {
      const redisKey = `payment-final:${params.orderId}`
      const cached = await redis.get(redisKey)
      if (cached) {
        const data = JSON.parse(cached)
        return NextResponse.json({
          status,
          message: data.message,
          errorCode: data.errorCode,
        })
      }
    } catch {
      // Redis unavailable, return status only
    }
  }

  return NextResponse.json({ status })
}
