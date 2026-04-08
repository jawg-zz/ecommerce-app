import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { status: true, cancelReason: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const status = order.status.toLowerCase()

  if (status !== 'pending' && order.cancelReason) {
    // Extract ResultCode and ResultDesc from "ResultCode: X - ResultDesc" format
    const match = order.cancelReason.match(/^ResultCode: (\d+) - (.+)$/)
    const errorCode = match ? match[1] : null
    const message = match ? match[2] : order.cancelReason
    return NextResponse.json({
      status,
      message,
      errorCode,
    })
  }

  return NextResponse.json({ status })
}
