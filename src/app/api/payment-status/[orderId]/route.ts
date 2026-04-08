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
    select: { status: true, cancelReason: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const status = order.status.toLowerCase()

  // If payment failed or cancelled, try to get error details from Redis first
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
      // Redis unavailable, fall through to DB
    }

    // Fall back to cancelReason stored in DB by callback handler
    if (order.cancelReason) {
      // Extract ResultDesc from "ResultCode: X - ResultDesc" format
      const match = order.cancelReason.match(/^ResultCode: \d+ - (.+)$/)
      const message = match ? match[1] : order.cancelReason
      return NextResponse.json({
        status,
        message,
        errorCode: null,
      })
    }
  }

  return NextResponse.json({ status })
}
