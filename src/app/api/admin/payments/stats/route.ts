import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'all'

  let dateFilter: { gte?: Date; lte?: Date } | undefined

  if (period === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dateFilter = { gte: today }
  } else if (period === 'week') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    dateFilter = { gte: weekAgo }
  } else if (period === 'month') {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    dateFilter = { gte: monthAgo }
  }

  const baseWhere = dateFilter ? { createdAt: dateFilter } : {}

  const [
    totalRevenue,
    paidCount,
    pendingCount,
    cancelledCount,
    totalOrders,
    recentDaily,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { ...baseWhere, status: OrderStatus.PAID },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { ...baseWhere, status: OrderStatus.PAID } }),
    prisma.order.count({ where: { ...baseWhere, status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { ...baseWhere, status: OrderStatus.CANCELLED } }),
    prisma.order.count({ where: baseWhere }),
    prisma.order.groupBy({
      by: ['status', 'createdAt'],
      where: baseWhere,
      _count: true,
      _sum: { total: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  const successRate = totalOrders > 0 ? ((paidCount / totalOrders) * 100).toFixed(1) : '0'

  const dailyMap: Record<string, { date: string; paid: number; pending: number; cancelled: number; revenue: number }> = {}

  recentDaily.forEach((row) => {
    const dateStr = row.createdAt.toISOString().split('T')[0]
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, paid: 0, pending: 0, cancelled: 0, revenue: 0 }
    }
    if (row.status === 'PAID') {
      dailyMap[dateStr].paid = row._count
      dailyMap[dateStr].revenue = row._sum.total || 0
    } else if (row.status === 'PENDING') {
      dailyMap[dateStr].pending = row._count
    } else if (row.status === 'CANCELLED') {
      dailyMap[dateStr].cancelled = row._count
    }
  })

  const trendData = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  return NextResponse.json({
    totalRevenue: totalRevenue._sum.total || 0,
    successRate: parseFloat(successRate),
    paidCount,
    pendingCount,
    cancelledCount,
    failedCount: cancelledCount,
    totalOrders,
    trendData,
  })
}