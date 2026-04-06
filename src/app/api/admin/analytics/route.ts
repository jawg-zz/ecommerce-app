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
  const period = searchParams.get('period') || '7d'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let dateFilter: Record<string, Date> = {}
  const now = new Date()

  switch (period) {
    case '24h':
      dateFilter = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      break
    case '7d':
      dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      break
    case '30d':
      dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      break
    case '90d':
      dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
      break
    case 'custom':
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      break
  }

  try {
    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      ordersByStatus,
      revenueByDay,
      topProducts,
      categoryDistribution,
      recentOrders,
      lowStockProducts,
      newCustomers,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          createdAt: dateFilter,
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({
        where: { createdAt: dateFilter },
      }),
      prisma.user.count({
        where: { role: 'USER' },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: dateFilter },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, SUM(total) as revenue, COUNT(*) as orders
        FROM "Order"
        WHERE status IN ('PAID', 'SHIPPED', 'DELIVERED')
        AND "createdAt" >= ${dateFilter.gte || new Date(0)}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.product.findMany({
        where: { stock: { gt: 0 } },
        orderBy: { reviewCount: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          category: true,
          image: true,
          _count: { select: { orderItems: true } },
        },
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: true,
        _sum: { stock: true },
      }),
      prisma.order.findMany({
        where: { createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5, gt: 0 } },
        orderBy: { stock: 'asc' },
        take: 10,
        select: { id: true, name: true, stock: true, category: true },
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: dateFilter,
        },
      }),
    ])

    const periodCompare = await prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        createdAt: {
          lt: dateFilter.gte || new Date(0),
          gte: dateFilter.gte ? new Date((dateFilter.gte as Date).getTime() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000) : new Date(0),
        },
      },
      _sum: { total: true },
      _count: true,
    })

    const currentRevenue = totalRevenue._sum.total || 0
    const previousRevenue = periodCompare._sum.total || 0
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    const revenueByDayArray = Array.isArray(revenueByDay) 
      ? revenueByDay.map((r: { date: Date; revenue: bigint; orders: bigint }) => ({
          date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
          revenue: Number(r.revenue),
          orders: Number(r.orders),
        }))
      : []

    const orderStatusCounts = Object.fromEntries(
      ordersByStatus.map((s) => [s.status, s._count])
    )

    return NextResponse.json({
      summary: {
        totalRevenue: currentRevenue,
        totalOrders,
        totalCustomers,
        newCustomers,
        revenueChange: Math.round(revenueChange * 10) / 10,
        averageOrderValue: totalOrders > 0 ? Math.round(currentRevenue / totalOrders) : 0,
      },
      revenueByDay: revenueByDayArray,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        category: p.category,
        image: p.image,
        totalSold: p._count.orderItems,
      })),
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c.category,
        productCount: c._count,
        totalStock: c._sum.stock || 0,
      })),
      orderStatus: orderStatusCounts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        user: o.user,
        status: o.status,
        total: o.total,
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
      })),
      lowStockAlerts: lowStockProducts,
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}