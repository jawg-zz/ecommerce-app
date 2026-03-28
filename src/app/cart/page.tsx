'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/Providers'
import { useToast } from '@/components/Toast'
import { formatPrice } from '@/lib/utils'
import { isNetworkError } from '@/lib/validation'

export default function CartPage() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const { showToast } = useToast()
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
      showToast(`Maximum available stock is ${item.product.stock}`, 'error')
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
          showToast(`Not enough stock. Only ${data.available} available.`, 'error')
        } else {
          showToast(data.error || 'Failed to update quantity', 'error')
        }
        return
      }

      setCart(data)
    } catch (err) {
      if (isNetworkError(err)) {
        showToast('Unable to connect. Please check your connection.', 'error')
      } else {
        showToast('Failed to update quantity. Please try again.', 'error')
      }
    } finally {
      setUpdatingItem(null)
    }
  }

  const handleRemove = async (productId: string) => {
    setUpdatingItem(productId)
    try {
      const res = await fetch(`/api/cart?productId=${productId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to remove item', 'error')
        return
      }

      setCart(data)
      showToast('Item removed from cart', 'success')
    } catch (err) {
      if (isNetworkError(err)) {
        showToast('Unable to connect. Please check your connection.', 'error')
      } else {
        showToast('Failed to remove item. Please try again.', 'error')
      }
    } finally {
      setUpdatingItem(null)
    }
  }

  if (!user) {
    return (
      <div className="py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>
          <p className="text-slate-500 mb-6">Please sign in to view your cart.</p>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>
          <p className="text-slate-500 mb-6">Your cart is empty.</p>
          <Link href="/products" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="card p-4 flex gap-4"
              >
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
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
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {item.product.name}
                  </h3>
                  <p className="text-blue-600 font-bold">
                    {formatPrice(item.product.price)}
                  </p>

                  {item.quantity >= item.product.stock && item.product.stock > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Max available: {item.product.stock}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button
                        onClick={() =>
                          handleUpdateQuantity(
                            item.productId,
                            item.quantity - 1
                          )
                        }
                        disabled={updatingItem === item.productId || item.quantity <= 1}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 min-w-[40px] text-center">
                        {updatingItem === item.productId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mx-auto"></div>
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(
                            item.productId,
                            item.quantity + 1
                          )
                        }
                        disabled={updatingItem === item.productId || item.quantity >= item.product.stock}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={updatingItem === item.productId}
                      className="text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-6 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="w-full btn-primary py-3"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
