'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { ProductCard } from '@/components/ProductCard'
import { formatPrice } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

function Breadcrumbs({ product }: { product: Product }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-8" aria-label="Breadcrumb">
      <Link 
        href="/" 
        className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Home
      </Link>
      <span className="text-slate-300">/</span>
      <Link 
        href="/products" 
        className="text-slate-500 hover:text-sky-600 transition-colors"
      >
        Products
      </Link>
      <span className="text-slate-300">/</span>
      <Link 
        href={`/products?category=${product.category}`}
        className="text-slate-500 hover:text-sky-600 transition-colors"
      >
        {product.category.charAt(0) + product.category.slice(1).toLowerCase()}
      </Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-900 font-medium truncate max-w-[200px]">{product.name}</span>
    </nav>
  )
}

function ProductImage({ product }: { product: Product }) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPosition({ x, y })
  }

  return (
    <div 
      className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative cursor-zoom-in"
      onMouseEnter={() => setIsZoomed(true)}
      onMouseLeave={() => setIsZoomed(false)}
      onMouseMove={handleMouseMove}
    >
      {product.image ? (
        <div className="w-full h-full overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
            style={isZoomed ? { transformOrigin: `${position.x}% ${position.y}%` } : undefined}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-32 w-32"
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
      
      {product.stock === 0 && (
        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-red-500 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-lg">
            Out of Stock
          </span>
        </div>
      )}

      {isZoomed && (
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-lg">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Hover to zoom
          </span>
        </div>
      )}
    </div>
  )
}

function StarRating({ rating, reviewCount }: { rating?: number; reviewCount?: number }) {
  const [hoverRating, setHoverRating] = useState(0)
  const currentRating = hoverRating || rating || 0
  const count = reviewCount || 12

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none"
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => {}}
          >
            <svg 
              className={`w-5 h-5 transition-colors ${
                star <= currentRating 
                  ? 'text-yellow-400' 
                  : 'text-slate-200'
              }`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      <span className="text-sm text-slate-500">
        {currentRating.toFixed(1)} ({count} reviews)
      </span>
    </div>
  )
}

function QuantitySelector({
  quantity,
  stock,
  onChange,
}: {
  quantity: number
  stock: number
  onChange: (qty: number) => void
}) {
  return (
    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
        aria-label="Decrease quantity"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
      <div className="w-16 h-12 flex items-center justify-center border-x border-slate-200 bg-slate-50">
        <span className="font-semibold text-slate-900 text-lg">{quantity}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(stock, quantity + 1))}
        disabled={quantity >= stock}
        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
        aria-label="Increase quantity"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { setCart } = useApp()
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch(`/api/products/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
        
        const relatedRes = await fetch(`/api/products?category=${data.category}&limit=4`)
        const relatedData = await relatedRes.json()
        setRelatedProducts((relatedData.products || []).filter((p: Product) => p.id !== data.id).slice(0, 4))
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
        setAdded(true)
        
        setTimeout(() => {
          setAdded(false)
        }, 2000)
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
            <div className="h-4 bg-slate-200 rounded w-48 mb-8" />
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="aspect-square bg-slate-200 rounded-2xl" />
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
        <Breadcrumbs product={product} />

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="animate-fade-in">
            <ProductImage product={product} />
          </div>

          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  categoryColors[product.category]
                }`}
              >
                {product.category.charAt(0) + product.category.slice(1).toLowerCase()}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                  Low Stock
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {product.name}
            </h1>

            <div className="mb-6">
              <StarRating rating={4.5} reviewCount={12} />
            </div>

            <p className="text-3xl lg:text-4xl font-bold text-sky-600 mb-6">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="mb-8">
                <h2 className="font-semibold text-slate-900 mb-2">Description</h2>
                <div 
                  className="text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                />
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <QuantitySelector
                    quantity={quantity}
                    stock={product.stock}
                    onChange={setQuantity}
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-1">Availability</p>
                  {product.stock > 0 ? (
                    <p className="text-green-600 font-medium flex items-center gap-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {product.stock} in stock
                    </p>
                  ) : (
                    <p className="text-red-500 font-medium">Out of stock</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || adding || added}
                className={`w-full py-4 text-lg font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'btn-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
              >
                {adding ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding to Cart...
                  </>
                ) : added ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart!
                  </>
                ) : product.stock === 0 ? (
                  'Out of Stock'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={() => {}}
                className="w-full mt-3 py-3 border-2 border-slate-200 text-slate-700 font-medium rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Add to Wishlist
              </button>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Free shipping on orders over KES 5,000
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                30-day return policy
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                1-year warranty included
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
