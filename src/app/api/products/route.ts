import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productRateLimiter } from '@/lib/ratelimit'

function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().split('')
  const s2 = str2.toLowerCase().split('')
  let matches = 0
  for (const char of s2) {
    if (s1.includes(char)) matches++
  }
  return matches / s2.length
}

function fuzzyMatch(search: string, target: string): boolean {
  const searchLower = search.toLowerCase()
  const targetLower = target.toLowerCase()
  
  if (targetLower.includes(searchLower)) return true
  if (searchLower.length < 2) return false
  
  return similarity(searchLower, targetLower) > 0.5
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || 'unknown'
  
  const { success } = await productRateLimiter.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'newest'
  
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minRating = searchParams.get('minRating')
  const inStock = searchParams.get('inStock')
  const autocomplete = searchParams.get('autocomplete') === 'true'

  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) {
      (where.price as Record<string, number>).gte = parseInt(minPrice)
    }
    if (maxPrice) {
      (where.price as Record<string, number>).lte = parseInt(maxPrice)
    }
  }

  if (minRating) {
    where.averageRating = { gte: parseFloat(minRating) }
  }

  if (inStock === 'true') {
    where.stock = { gt: 0 }
  }

  let orderBy: Record<string, unknown> = {}
  switch (sort) {
    case 'price_asc':
      orderBy = { price: 'asc' }
      break
    case 'price_desc':
      orderBy = { price: 'desc' }
      break
    case 'name':
      orderBy = { name: 'asc' }
      break
    case 'rating':
      orderBy = { averageRating: 'desc' }
      break
    case 'popular':
      orderBy = { reviewCount: 'desc' }
      break
    default:
      orderBy = { createdAt: 'desc' }
  }

  if (autocomplete && search) {
    const allProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        category: true,
        stock: true,
        averageRating: true,
        reviewCount: true,
      },
      take: 10,
    })

    const scored = allProducts
      .map((p) => ({
        ...p,
        score: p.name.toLowerCase().startsWith(search.toLowerCase())
          ? 1
          : fuzzyMatch(search, p.name) ? 0.8 : 0.5,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    return NextResponse.json({
      products: scored,
      total: scored.length,
      suggestions: scored.map((p) => p.name),
    })
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        image: true,
        stock: true,
        averageRating: true,
        reviewCount: true,
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}