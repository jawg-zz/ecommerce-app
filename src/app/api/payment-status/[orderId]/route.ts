import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

  return NextResponse.json({
    status: order.status.toLowerCase(),
  })
}
