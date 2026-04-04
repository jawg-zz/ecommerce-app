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
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}

  if (status === 'in_stock') {
    where.stock = { gt: 5 }
  } else if (status === 'low_stock') {
    where.stock = { gt: 0, lte: 5 }
  } else if (status === 'out_of_stock') {
    where.stock = 0
  }

  try {
    const [products, stats] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { stock: 'asc' },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          category: true,
          image: true,
          averageRating: true,
          reviewCount: true,
          createdAt: true,
        },
      }),
      prisma.product.aggregate({
        where: {},
        _sum: { stock: true },
        _count: true,
      }),
    ])

    const totalProducts = stats._count
    const inStock = products.filter((p) => p.stock > 5).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
    const outOfStock = products.filter((p) => p.stock === 0).length

    return NextResponse.json({
      products,
      summary: {
        total: totalProducts,
        totalStock: stats._sum.stock || 0,
        inStock,
        lowStock,
        outOfStock,
        lowStockPercentage: totalProducts > 0 ? Math.round((lowStock / totalProducts) * 100) : 0,
        outOfStockPercentage: totalProducts > 0 ? Math.round((outOfStock / totalProducts) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { productId, stock, operation } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    let newStock: number
    if (operation === 'add') {
      newStock = product.stock + (stock || 1)
    } else if (operation === 'remove') {
      newStock = Math.max(0, product.stock - (stock || 1))
    } else if (operation === 'set') {
      newStock = stock || 0
    } else {
      newStock = stock || product.stock
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    })

    if (newStock <= 5 && product.stock > 5) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'LOW_STOCK_ALERT',
          title: 'Low Stock Alert',
          message: `${updated.name} is now low on stock (${newStock} remaining)`,
          link: `/admin/products`,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update inventory:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}