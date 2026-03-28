'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    refreshCart()
  }, [user, router, refreshCart])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Checkout failed')
        setProcessing(false)
        return
      }

      const completeRes = await fetch('/api/checkout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: data.clientSecret,
          shippingAddress,
        }),
      })

      if (completeRes.ok) {
        const order = await completeRes.json()
        setCart({ items: [], total: 0 })
        router.push(`/orders?success=true`)
      } else {
        setError('Payment processing failed')
      }
    } catch {
      setError('An error occurred during checkout')
    } finally {
      setProcessing(false)
    }
  }

  if (!user) {
    return null
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">Checkout</h1>
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
        <h1 className="text-2xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Shipping Address</h2>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.name}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.address}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, address: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, state: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.zipCode}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Country
                    </label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, country: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="card p-6 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2 mb-4">
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
              type="submit"
              form="checkout-form"
              onClick={handleSubmit}
              disabled={processing}
              className="w-full btn-primary py-3"
            >
              {processing ? 'Processing...' : `Pay ${formatPrice(cart.total)}`}
            </button>

            <p className="text-xs text-slate-500 text-center mt-4">
              Test mode: Use card 4242 4242 4242 4242
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
