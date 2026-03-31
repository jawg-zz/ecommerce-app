import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

const orderStatuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const status = searchParams.get('status')
  const orderId = searchParams.get('orderId')

  const where = orderId
    ? { id: orderId, userId: user.id }
    : status && orderStatuses.includes(status as OrderStatus)
    ? { userId: user.id, status: status as OrderStatus }
    : { userId: user.id }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: orderId ? undefined : { createdAt: 'desc' },
      skip: orderId ? 0 : (page - 1) * limit,
      take: orderId ? 1 : limit,
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({
    orders: orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        product: {
          ...item.product,
        },
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
