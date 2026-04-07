'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: string
  productId: string
  product: {
    name: string
    image: string | null
  }
  quantity: number
  price: number
}

interface Order {
  id: string
  orderNumber: string | null
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  shippingAddress: {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null
  createdAt: string
}

const statusSteps = [
  { key: 'PENDING', label: 'Order Placed', icon: 'shopping-bag' },
  { key: 'PAID', label: 'Processing', icon: 'banknote' },
  { key: 'SHIPPED', label: 'Shipped', icon: 'truck' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'home' },
]

const statusOrder: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: -1,
}

const statusConfig: Record<
  string,
  { color: string; bgColor: string; dotColor: string }
> = {
  PENDING: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },
  PAID: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  SHIPPED: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    dotColor: 'bg-purple-500',
  },
  DELIVERED: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
  },
  CANCELLED: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
}

function OrderTrackingForm() {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get('orderId') || ''

  const [orderId, setOrderId] = useState(initialOrderId)
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOrder(null)

    if (!orderId.trim()) {
      setError('Please enter an order ID')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/orders/public?orderId=${orderId.trim()}`)

      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found. Please check your order ID and try again.')
        } else {
          setError('Unable to fetch order details. Please try again.')
        }
        setLoading(false)
        return
      }

      const data = await res.json()
      setOrder(data.order)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? statusOrder[order.status] : -1
  const cancelled = order?.status === 'CANCELLED'

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
            <p className="text-slate-600">
              Enter your order ID to see the current status
            </p>
          </div>

          {/* Search Form */}
          <div className="card p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="orderId"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Order ID
                </label>
                <input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., ORD-ABC12345"
                  className="input-field"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm2-9a1 1 0 100 2h1a1 1 0 100-2H5a1 1 0 100 2h1a1 1 0 100-2H5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Tracking...
                  </span>
                ) : (
                  'Track Order'
                )}
              </button>
            </form>
          </div>

          {/* Order Details */}
          {order && (
            <div className="space-y-6 animate-fade-in">
              {/* Order Header */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Order ID</p>
                    <p className="text-lg font-semibold">
                      #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusConfig[order.status].bgColor
                    } ${statusConfig[order.status].color}`}
                  >
                    {order.status === 'CANCELLED' ? 'Cancelled' : order.status}
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Placed on{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-KE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Status Timeline */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-6">Order Status</h2>

                {cancelled ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">Order Cancelled</p>
                      <p className="text-sm text-red-600">
                        This order was cancelled and will not be delivered.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-slate-200">
                      <div
                        className="w-full bg-sky-500 transition-all duration-500"
                        style={{
                          height: `${Math.min(100, (currentStep / 3) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-6">
                      {statusSteps.map((step, index) => {
                        const isCompleted = index <= currentStep
                        const isCurrent = index === currentStep

                        return (
                          <div key={step.key} className="flex items-center gap-4">
                            <div
                              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-sky-500 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              } ${isCurrent ? 'ring-4 ring-sky-100' : ''}`}
                            >
                              {isCompleted ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span className="text-sm font-medium">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p
                                className={`font-medium ${
                                  isCompleted ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </p>
                              {isCurrent && order.status === step.key && (
                                <p className="text-sm text-sky-600">
                                  Your order is currently {step.label.toLowerCase()}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {item.product.image ? (
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            loading="lazy"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6"
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span>{formatPrice(order.subtotal || order.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Shipping</span>
                    <span className="text-green-600">
                      {order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-100">
                    <span>Total</span>
                    <span className="text-sky-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-slate-900">
                        {order.shippingAddress.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {order.shippingAddress.address}
                      </p>
                      <p className="text-sm text-slate-600">
                        {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                        {order.shippingAddress.zipCode}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Link href="/orders" className="flex-1 btn-secondary py-3 text-center">
                  View All Orders
                </Link>
                <Link href="/products" className="flex-1 btn-primary py-3 text-center">
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          {/* No Order State - Show Help Text */}
          {!order && !error && !loading && (
            <div className="text-center py-8 text-slate-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 .549-.135 1.064-.372 1.523M12 18v5m0-5h.01M12 12c-2.21 0-4-1.79-4-4 0-1.106.446-2.100 1.168-2.823M12 12c2.21 0 4 1.79 4 4 0 1.106-.446 2.100-1.168 2.823M12 12c-1.742 0-3.294-.927-4.127-2.312M8.228 9C7.174 9.664 6.5 10.735 6.5 12c0 1.79 1.79 3.5 4 3.5 1.742 0 3.294.927 4.127 2.312"
                />
              </svg>
              <p className="text-sm">
                You can find your order ID in your confirmation email or SMS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderTrackingLoading() {
  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-10 bg-slate-200 rounded w-48 mx-auto mb-2 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded w-64 mx-auto animate-pulse" />
          </div>
          <div className="card p-6">
            <div className="h-12 bg-slate-200 rounded mb-4 animate-pulse" />
            <div className="h-12 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderTrackingWithParams() {
  return <OrderTrackingForm />
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<OrderTrackingLoading />}>
      <OrderTrackingWithParams />
    </Suspense>
  )
}