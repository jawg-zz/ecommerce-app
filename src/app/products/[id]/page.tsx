'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { setCart } = useApp()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch(`/api/products/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
      } else {
        router.push('/products')
      }
      setLoading(false)
    }

    fetchProduct()
  }, [params.id, router])

  const handleAddToCart = async () => {
    if (!product) return
    setAdding(true)

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity }),
      })

      if (res.ok) {
        const data = await res.json()
        setCart(data)
        router.push('/cart')
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-slate-200 rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded w-3/4" />
                <div className="h-6 bg-slate-200 rounded w-1/4" />
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-slate-700">
            Products
          </Link>
          <span>/</span>
          <span className="text-slate-900">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
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
                  className="h-24 w-24"
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
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                categoryColors[product.category]
              }`}
            >
              {product.category}
            </span>

            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {product.name}
            </h1>

            <p className="text-3xl font-bold text-blue-600 mb-6">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <p className="text-slate-600 mb-6">{product.description}</p>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  -
                </button>
                <span className="px-4 py-2">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  +
                </button>
              </div>

              <span className="text-slate-500">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50"
            >
              {adding ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
