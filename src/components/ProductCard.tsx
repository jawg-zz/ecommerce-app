'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useApp } from './Providers'
import { useToast } from './Toast'
import { formatPrice } from '@/lib/utils'
import { isNetworkError } from '@/lib/validation'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { setCart, refreshCart } = useApp()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (product.stock === 0) {
      showToast('This item is currently out of stock', 'error')
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
          showToast(`Not enough stock available. Only ${data.available} items in stock.`, 'error')
        } else {
          showToast(data.error || 'Failed to add to cart', 'error')
        }
        return
      }

      setCart(data)
      setAdded(true)
      showToast(`${product.name} added to cart!`, 'success')
      
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      if (isNetworkError(err)) {
        showToast('Unable to connect. Please check your internet connection.', 'error')
      } else {
        showToast('Failed to add to cart. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    ELECTRONICS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    CLOTHING: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    BOOKS: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  }

  const colors = categoryColors[product.category] || categoryColors.ELECTRONICS

  return (
    <Link 
      href={`/products/${product.id}`} 
      className="card group block overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-square bg-slate-100 relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 transition-transform duration-300 group-hover:scale-110"
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
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
        >
          {product.category}
        </span>

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
              Out of Stock
            </span>
          </div>
        )}

        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute bottom-3 left-3 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full text-xs font-medium border border-orange-200">
            Only {product.stock} left
          </span>
        )}

        <div 
          className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={handleAddToCart}
            disabled={loading || product.stock === 0}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-white text-slate-900 hover:bg-sky-50 active:scale-[0.98]'
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
                Quick Add
              </>
            )}
          </button>
        </div>

        {product.stock > 0 && (
          <div className={`absolute top-3 right-3 transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToCart(e)
              }}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-sky-50 transition-colors touch-target"
              aria-label="Add to cart"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <svg 
              key={i} 
              className={`w-3.5 h-3.5 ${i < 4 ? 'text-yellow-400' : 'text-slate-200'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-xs text-slate-400 ml-1">(12)</span>
        </div>

        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-sky-600 transition-colors">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-sky-600 font-bold text-lg">
            {formatPrice(product.price)}
          </p>
          
          {product.stock > 0 && product.stock <= 5 && (
            <span className="text-xs text-orange-600 font-medium">
              Low Stock
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
