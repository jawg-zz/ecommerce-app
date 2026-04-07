import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import type { ShippingAddress } from '@/lib/types'

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
  const search = searchParams.get('search') || ''
  const exportAll = searchParams.get('export') === 'csv'

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

  let searchFilter: any = {}
  if (search) {
    const searchLower = search.toLowerCase()
    searchFilter = {
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { mpesaCheckoutRequestId: { contains: search, mode: 'insensitive' } },
        { mpesaMerchantRequestId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: searchLower, mode: 'insensitive' } } },
        { user: { name: { contains: searchLower, mode: 'insensitive' } } },
      ],
    }
  }

  const where = {
    ...(status && orderStatuses.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    ...searchFilter,
  }

  const fetchLimit = exportAll ? 10000 : limit

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
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: exportAll ? 0 : (page - 1) * fetchLimit,
      take: fetchLimit,
    }),
    prisma.order.count({ where }),
  ])

  const transactions = orders.map((order) => ({
    id: order.id,
    orderId: order.id,
    reference: order.reference,
    customerName: order.user.name,
    customerEmail: order.user.email,
    amount: order.total,
    status: order.status,
    mpesaReceipt: order.mpesaCheckoutRequestId || order.mpesaMerchantRequestId || null,
    phone: (order.shippingAddress as unknown as ShippingAddress)?.phone || null,
    cancelReason: order.cancelReason,
    paymentMethod: order.stripePaymentId ? 'STRIPE' : 'M-PESA',
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }))

  if (exportAll) {
    const csvHeader = 'Order ID,Customer Name,Customer Email,Amount,Status,M-Pesa Receipt,Phone,Payment Method,Error/Reason,Created At\n'
    const csvRows = transactions
      .map(
        (t) =>
          `"${t.orderId}","${t.customerName}","${t.customerEmail}","${t.amount}","${t.status}","${t.mpesaReceipt || ''}","${t.phone || ''}","${t.paymentMethod}","${t.cancelReason || ''}","${t.createdAt}"`
      )
      .join('\n')

    return new NextResponse(csvHeader + csvRows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}