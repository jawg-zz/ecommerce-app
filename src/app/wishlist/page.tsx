'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'
import { isNetworkError } from '@/lib/validation'
import toast from 'react-hot-toast'

function EmptyWishlist() {
  return (
    <div className="py-16">
      <div className="container-custom">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-16 h-16 text-slate-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center animate-bounce-in">
              <span className="text-2xl">❤️</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Your wishlist is empty
          </h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Save items you love by tapping the heart icon on any product. 
            They&apos;ll appear here for easy access!
          </p>
          
          <Link href="/products" className="btn-primary py-3 px-8">
            Start Shopping
          </Link>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-4">Browse by category</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Electronics', 'Clothing', 'Books'].map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${cat.toUpperCase()}`}
                  className="px-4 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-full text-sm text-slate-600 transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, setCart, refreshCart, user } = useApp()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAddToCart = async (productId: string, productName: string, productPrice: number, productImage: string | null, productStock: number) => {
    if (productStock === 0) {
      toast.error('This item is currently out of stock')
      return
    }

    setLoading(productId)

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('stock') || data.error?.includes('available')) {
          toast.error(`Not enough stock available. Only ${data.available} items in stock.`)
        } else {
          toast.error(data.error || 'Failed to add to cart')
        }
        return
      }

      setCart(data)
      removeFromWishlist(productId)
      toast.success(`${productName} added to cart!`)
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error('Unable to connect. Please check your internet connection.')
      } else {
        toast.error('Failed to add to cart. Please try again.')
      }
    } finally {
      setLoading(null)
    }
  }

  if (wishlist.length === 0) {
    return <EmptyWishlist />
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Wishlist</h1>
            <p className="text-slate-500 mt-1">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <div
              key={product.id}
              className="card overflow-hidden group animate-fade-in"
            >
              <Link href={`/products/${product.id}`}>
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      quality={85}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg
                        className="h-20 w-20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 shadow-sm">
                    {product.category}
                  </span>
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/products/${product.id}`}>
                  <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-sky-600 transition-colors min-h-[3rem]">
                    {product.name}
                  </h3>
                </Link>
                
                <p className="text-sky-600 font-bold text-lg mb-3">
                  {formatPrice(product.price)}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product.id, product.name, product.price, product.image, 10)}
                    disabled={loading === product.id}
                    className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    {loading === product.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
