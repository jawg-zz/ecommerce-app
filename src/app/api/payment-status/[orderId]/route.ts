import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { 
      status: true, 
      cancelReason: true,
      userId: true 
    },
  })

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const errorCodeMatch = order.cancelReason?.match(/ResultCode:?\s*(\d+)/)
  const errorCode = errorCodeMatch ? errorCodeMatch[1] : null

  return NextResponse.json({
    status: order.status.toLowerCase(),
    errorCode,
    message: order.cancelReason || null
  })
}
