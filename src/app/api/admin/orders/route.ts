import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
})

const orderStatuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const status = searchParams.get('status')
  const dateRange = searchParams.get('dateRange') || 'all'
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  let dateFilter: { gte?: Date; lte?: Date } | undefined

  if (dateRange === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dateFilter = { gte: today }
  } else if (dateRange === 'week') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    dateFilter = { gte: weekAgo }
  } else if (dateRange === 'month') {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    dateFilter = { gte: monthAgo }
  } else if (dateRange === 'custom') {
    if (dateFrom || dateTo) {
      dateFilter = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59')
    }
  }

  const where = {
    ...(status && orderStatuses.includes(status as OrderStatus) 
      ? { status: status as OrderStatus } 
      : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
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
