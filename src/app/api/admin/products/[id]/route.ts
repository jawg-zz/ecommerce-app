import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const productSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  category: z.enum(['ELECTRONICS', 'CLOTHING', 'BOOKS']).optional(),
  image: z.string().url().optional(),
  stock: z.number().int().min(0).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = productSchema.parse(body)

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.product.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
