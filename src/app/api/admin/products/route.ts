import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

const ALLOWED_IMAGE_DOMAINS = ['images.unsplash.com', 'via.placeholder.com', 'res.cloudinary.com', 'cdn.shopify.com']

const imageUrlSchema = z.string()
  .url()
  .optional()
  .refine((url) => {
    if (!url) return true
    try {
      const parsed = new URL(url)
      return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
    } catch {
      return false
    }
  }, { message: 'Image URL must be from allowed domains' })

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().positive(),
  category: z.enum(['ELECTRONICS', 'CLOTHING', 'BOOKS']),
  image: imageUrlSchema,
  stock: z.number().int().min(0).default(0),
}).transform(data => ({
  ...data,
  description: data.description?.trim() || undefined,
}))

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search')

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = productSchema.parse(body)

    const product = await prisma.product.create({
      data,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    logError('Create product error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to create product. Please try again.' },
      { status: 500 }
    )
  }
}
