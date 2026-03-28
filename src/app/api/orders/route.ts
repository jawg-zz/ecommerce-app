import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}
