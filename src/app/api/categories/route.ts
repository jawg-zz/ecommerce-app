import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const products = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      category: true,
    },
  })

  const formattedCategories = products.map(cat => ({
    name: cat.category,
    count: cat._count.category,
  }))

  return NextResponse.json(formattedCategories)
}
