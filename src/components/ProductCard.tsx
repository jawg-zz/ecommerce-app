'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from './Providers'
import { formatPrice } from '@/lib/utils'
import { isNetworkError } from '@/lib/validation'
import toast from 'react-hot-toast'
import { QuickViewModal } from './QuickViewModal'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
  averageRating?: number
  reviewCount?: number
}

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { setCart, addToWishlist, removeFromWishlist, isInWishlist, addToRecentlyViewed } = useApp()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [wishlistAnimating, setWishlistAnimating] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)
  const inWishlist = isInWishlist(product.id)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (product.stock === 0) {
      toast.error('This item is currently out of stock')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('stock') || data.error?.includes('available')) {
          const stockMatch = data.error.match(/Only (\d+) items? available/)
          toast.error(`Not enough stock available.${stockMatch ? ` Only ${stockMatch[1]} items in stock.` : ''}`)
        } else {
          toast.error(data.error || 'Failed to add to cart')
        }
        return
      }

      setCart(data)
      setAdded(true)
      toast.success(`${product.name} added to cart!`)
      
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error('Unable to connect. Please check your internet connection.')
      } else {
        toast.error('Failed to add to cart. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setWishlistLoading(true)
    
    if (inWishlist) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
      })
      setWishlistAnimating(true)
      setTimeout(() => setWishlistAnimating(false), 600)
    }
    
    setWishlistLoading(false)
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowQuickView(true)
  }

  const categoryColors: Record<string, { bg: string; text: string }> = {
    ELECTRONICS: { bg: 'bg-blue-100', text: 'text-blue-700' },
    CLOTHING: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    BOOKS: { bg: 'bg-amber-100', text: 'text-amber-700' },
  }

  const colors = categoryColors[product.category] || categoryColors.ELECTRONICS
  const rating = product.averageRating ?? 0
  const reviewCount = product.reviewCount ?? 0

  return (
    <>
      <Link 
        href={`/products/${product.id}`} 
        className="card group block overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          {!imageLoaded && product.image && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
          )}
          
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                setImageLoaded(true)
              }}
              className={`object-cover transition-all duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              priority={priority}
              quality={85}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <svg
                className="h-20 w-20 transition-transform duration-300 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} shadow-sm`}>
            {product.category}
          </span>

          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
              inWishlist 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white text-slate-400 hover:text-red-500 hover:bg-red-50'
            } ${wishlistAnimating ? 'animate-scale' : ''}`}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg 
              className="w-4 h-4" 
              fill={inWishlist ? 'currentColor' : 'none'} 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <button
            onClick={handleQuickView}
            className={`absolute left-1/2 -translate-x-1/2 bottom-4 px-4 py-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            aria-label={`Quick view ${product.name}`}
          >
            Quick View
          </button>

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
              <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                Out of Stock
              </span>
            </div>
          )}

          {product.stock > 0 && product.stock <= 5 && (
            <span className="absolute top-3 right-3 bg-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg animate-pulse">
              {product.stock} left
            </span>
          )}

          <div 
            className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <button
              onClick={handleAddToCart}
              disabled={loading || product.stock === 0}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-slate-900 hover:bg-sky-50 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : added ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Added!
                </>
              ) : product.stock === 0 ? (
                'Out of Stock'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4">
          {rating > 0 ? (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg 
                  key={i} 
                  className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-slate-200'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs text-slate-400 ml-1">({rating.toFixed(1)}{reviewCount > 0 ? `, ${reviewCount}` : ''})</span>
            </div>
          ) : null}

          <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-sky-600 transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between">
            <p className="text-sky-600 font-bold text-lg">
              {formatPrice(product.price)}
            </p>
            
            {product.stock > 5 ? (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                In Stock
              </span>
            ) : product.stock > 0 ? (
              <span className="text-xs text-orange-600 font-medium">
                Low Stock
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <QuickViewModal
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </>
  )
}