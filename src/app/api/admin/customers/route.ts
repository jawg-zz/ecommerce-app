import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'newest'

  const where: Record<string, unknown> = {
    role: 'USER',
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  let orderBy: Record<string, string> = { createdAt: 'desc' }
  if (sort === 'oldest') {
    orderBy = { createdAt: 'asc' }
  } else if (sort === 'name') {
    orderBy = { name: 'asc' }
  }

  try {
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const [orderStats, lastOrder] = await Promise.all([
          prisma.order.aggregate({
            where: { userId: customer.id, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
            _sum: { total: true },
            _count: true,
          }),
          prisma.order.findFirst({
            where: { userId: customer.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ])

        return {
          ...customer,
          totalOrders: customer._count.orders,
          totalSpent: orderStats._sum.total || 0,
          lastOrderDate: lastOrder?.createdAt || null,
        }
      })
    )

    return NextResponse.json({
      customers: enrichedCustomers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}