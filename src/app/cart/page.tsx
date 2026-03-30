'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'
import { isNetworkError } from '@/lib/validation'
import toast from 'react-hot-toast'

function QuantitySelector({
  quantity,
  stock,
  onChange,
  disabled,
}: {
  quantity: number
  stock: number
  onChange: (qty: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= 1}
        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 transition-colors touch-target"
        aria-label="Decrease quantity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
      <div className="w-12 h-10 flex items-center justify-center border-x border-slate-200 bg-slate-50">
        {disabled ? (
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="font-medium text-slate-900">{quantity}</span>
        )}
      </div>
      <button
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= stock}
        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 transition-colors touch-target"
        aria-label="Increase quantity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

function EmptyCart({ isLoggedIn }: { isLoggedIn: boolean }) {
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center animate-bounce-in">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Your cart is empty
          </h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Looks like you haven&apos;t added any items to your cart yet. 
            Start shopping to fill it up!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products" className="btn-primary py-3 px-8">
              Start Shopping
            </Link>
            {!isLoggedIn && (
              <Link href="/login" className="btn-secondary py-3 px-8">
                Sign In
              </Link>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-4">Why not check out these popular categories?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Electronics', 'Clothing', 'Books'].map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${cat.toUpperCase()}`}
                  className="px-4 py-2 bg-slate-50 hover:bg-sky-50 hover:text-sky-600 rounded-full text-sm text-slate-600 transition-colors"
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

export default function CartPage() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const [loading, setLoading] = useState(false)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      refreshCart()
    }
  }, [user, refreshCart])

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) return
    
    const item = cart.items.find(i => i.productId === productId)
    if (item && quantity > item.product.stock) {
      toast.error(`Maximum available stock is ${item.product.stock}`)
      return
    }

    setUpdatingItem(productId)
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('stock') || data.error?.includes('available')) {
          toast.error(`Not enough stock. Only ${data.available} available.`)
        } else {
          toast.error(data.error || 'Failed to update quantity')
        }
        return
      }

      setCart(data)
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error('Unable to connect. Please check your connection.')
      } else {
        toast.error('Failed to update quantity. Please try again.')
      }
    } finally {
      setUpdatingItem(null)
    }
  }

  const handleRemove = async (productId: string) => {
    setUpdatingItem(productId)
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 0 }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to remove item')
        return
      }

      setCart(data)
      toast.success('Item removed from cart')
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error('Unable to connect. Please check your connection.')
      } else {
        toast.error('Failed to remove item. Please try again.')
      }
    } finally {
      setUpdatingItem(null)
    }
  }

  if (!user) {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Sign in to view your cart</h1>
            <p className="text-slate-500 mb-6">Please sign in to see your shopping cart items and proceed to checkout.</p>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return <EmptyCart isLoggedIn={!!user} />
  }

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Shopping Cart</h1>
            <p className="text-slate-500 mt-1">{totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="card p-4 sm:p-6 flex gap-4 sm:gap-6 animate-fade-in"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link 
                        href={`/products/${item.productId}`}
                        className="font-semibold text-slate-900 hover:text-sky-600 transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sky-600 font-bold mt-1">
                        {formatPrice(item.product.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={updatingItem === item.productId}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-target flex-shrink-0"
                      aria-label="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {item.quantity >= item.product.stock && item.product.stock > 0 && (
                    <p className="text-xs text-orange-600 mt-2 font-medium">
                      Maximum available: {item.product.stock}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <QuantitySelector
                      quantity={item.quantity}
                      stock={item.product.stock}
                      onChange={(qty) => handleUpdateQuantity(item.productId, qty)}
                      disabled={updatingItem === item.productId}
                    />
                    
                    <p className="font-bold text-slate-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 h-fit sticky top-24">
              <h2 className="text-lg font-semibold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>Included</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-slate-900">{formatPrice(cart.total)}</span>
                    <p className="text-xs text-slate-500">KES (Kenyan Shillings)</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push('/checkout')}
                className="w-full btn-primary py-3.5 text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Proceed to Checkout
              </button>

              <Link
                href="/products"
                className="block text-center mt-4 text-sm text-slate-500 hover:text-sky-600 transition-colors"
              >
                Continue Shopping
              </Link>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
