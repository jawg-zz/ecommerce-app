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
  const format = searchParams.get('format') || 'csv'
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) {
      (where.createdAt as Record<string, Date>).gte = new Date(dateFrom)
    }
    if (dateTo) {
      (where.createdAt as Record<string, Date>).lte = new Date(dateTo)
    }
  }

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    })

    if (format === 'csv') {
      const headers = [
        'Order ID',
        'Date',
        'Customer Name',
        'Customer Email',
        'Status',
        'Items',
        'Total',
        'Shipping Address',
      ]

      const rows = orders.map((order) => {
        const itemsList = order.items
          .map((item) => `${item.product.name} (x${item.quantity})`)
          .join('; ')
        const address = order.shippingAddress
          ? `${(order.shippingAddress as Record<string, string>).address}, ${(order.shippingAddress as Record<string, string>).city}`
          : ''

        return [
          order.id.slice(0, 8),
          new Date(order.createdAt).toISOString(),
          order.user.name,
          order.user.email,
          order.status,
          `"${itemsList.replace(/"/g, '""')}"`,
          (order.total / 100).toFixed(2),
          `"${address.replace(/"/g, '""')}"`,
        ].join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (format === 'json') {
      const data = orders.map((order) => ({
        id: order.id,
        date: order.createdAt.toISOString(),
        customer: {
          name: order.user.name,
          email: order.user.email,
        },
        status: order.status,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        total: order.total,
        shippingAddress: order.shippingAddress,
      }))

      return NextResponse.json(data)
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Failed to export orders:', error)
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    )
  }
}