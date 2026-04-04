'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  stock: number
  averageRating?: number
  reviewCount?: number
}

interface QuickViewModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (product) {
      setQuantity(1)
    }
  }, [product])

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
        toast.success(`${product.name} added to cart!`)
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add to cart')
      }
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  const handleAddToWishlist = async () => {
    if (!product) return

    try {
      const method = inWishlist ? 'DELETE' : 'POST'
      const res = await fetch(`/api/wishlist/${product.id}`, {
        method,
      })

      if (res.ok) {
        setInWishlist(!inWishlist)
        toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist')
      }
    } catch {
      toast.error('Failed to update wishlist')
    }
  }

  if (!isOpen || !product) return null

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 h-full max-h-[90vh] overflow-y-auto">
          <div className="relative aspect-square bg-slate-100">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                <span className="bg-red-500 text-white px-6 py-2 rounded-full text-lg font-semibold">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[product.category] || ''}`}>
                {product.category?.charAt(0)}{product.category?.slice(1).toLowerCase() || 'Product'}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                  Only {product.stock} left
                </span>
              )}
            </div>

            <Link 
              href={`/products/${product.id}`}
              className="text-xl md:text-2xl font-bold text-slate-900 hover:text-sky-600 transition-colors"
              onClick={onClose}
            >
              {product.name}
            </Link>

            {product.averageRating !== undefined && product.averageRating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(product.averageRating || 0)
                          ? 'text-yellow-400'
                          : 'text-slate-200'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-slate-500">
                  {product.averageRating.toFixed(1)} ({product.reviewCount || 0} reviews)
                </span>
              </div>
            )}

            <p className="text-3xl font-bold text-sky-600 mt-4">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <p className="text-slate-600 mt-4 line-clamp-3 text-sm">
                {product.description}
              </p>
            )}

            <div className="mt-auto pt-6 space-y-4">
              {product.stock > 0 ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-sky-600 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-semibold">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock}
                        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-sky-600 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-slate-500">
                      {product.stock} in stock
                    </span>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={adding || product.stock === 0}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-slate-200 text-slate-500 rounded-xl font-semibold cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}

              <button
                onClick={handleAddToWishlist}
                className="w-full py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <svg 
                  className={`w-5 h-5 ${inWishlist ? 'text-red-500 fill-current' : ''}`}
                  fill={inWishlist ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
              </button>

              <Link
                href={`/products/${product.id}`}
                onClick={onClose}
                className="block text-center text-sm text-sky-600 hover:text-sky-700"
              >
                View Full Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}