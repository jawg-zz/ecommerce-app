'use client'

import Link from 'next/link'
import { useApp } from './Providers'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | { toNumber(): number }
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { setCart, refreshCart } = useApp()

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      })

      if (res.ok) {
        const data = await res.json()
        setCart(data)
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <Link href={`/products/${product.id}`} className="card block overflow-hidden">
      <div className="aspect-square bg-slate-100 relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
            categoryColors[product.category]
          }`}
        >
          {product.category}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
          {product.name}
        </h3>
        <p className="text-blue-600 font-bold text-lg mb-3">
          {formatPrice(typeof product.price === 'number' ? product.price : product.price.toNumber())}
        </p>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full btn-primary disabled:opacity-50"
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  )
}
