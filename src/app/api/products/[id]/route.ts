import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Parse specifications if it's a string
  const specifications = product.specifications 
    ? typeof product.specifications === 'string' 
      ? JSON.parse(product.specifications) 
      : product.specifications
    : null

  return NextResponse.json({ ...product, specifications })
}
