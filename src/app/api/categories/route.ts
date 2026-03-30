import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const CATEGORIES_CACHE_TTL = 300

export async function GET() {
  const cacheKey = 'categories:list'
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached))
    }
  } catch {
    // Continue without cache on error
  }

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

  try {
    await redis.setex(cacheKey, CATEGORIES_CACHE_TTL, JSON.stringify(formattedCategories))
  } catch {
    // Continue without cache on error
  }

  return NextResponse.json(formattedCategories)
}
