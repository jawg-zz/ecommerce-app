import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getMpesaErrorMessage, extractMpesaResultCode } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // Check Redis cache first (set by callback or payment-check worker)
  const cached = await redis.get(`payment-final:${params.orderId}`)
  if (cached) {
    const data = JSON.parse(cached)
    // If we have a cancelReason from DB but the cache doesn't have a mapped message, map it
    if (data.status === 'cancelled' && data.errorCode && !data.mapped) {
      data.message = getMpesaErrorMessage(String(data.errorCode))
      data.mapped = true
    }
    return NextResponse.json(data)
  }

  // No cache — fall back to database
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { status: true, cancelReason: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const status = order.status.toLowerCase()

  if (status !== 'pending' && order.cancelReason) {
    const errorCode = extractMpesaResultCode(order.cancelReason)
    const message = errorCode ? getMpesaErrorMessage(errorCode) : order.cancelReason
    return NextResponse.json({
      status,
      message,
      errorCode,
    })
  }

  return NextResponse.json({ status })
}
