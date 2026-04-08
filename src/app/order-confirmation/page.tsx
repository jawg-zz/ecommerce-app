'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product: {
    name: string
    image: string | null
    price: number
  }
}

interface Order {
  id: string
  orderNumber: string | null
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  paymentMethod: string | null
  mpesaReceiptNumber: string | null
  shippingAddress: {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null
  createdAt: string
}

function getEstimatedDelivery(): string {
  const today = new Date()
  const deliveryDate = new Date(today)
  deliveryDate.setDate(today.getDate() + 3)
  return deliveryDate.toLocaleDateString('en-KE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function OrderConfirmationContent() {
  const router = useRouter()
  const { user } = useApp()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!orderId) {
      router.push('/orders')
      return
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders?orderId=${orderId}`)
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch order')
        }

        const data = await res.json()
        
        if (!data.orders || data.orders.length === 0) {
          setError('Order not found')
          setLoading(false)
          return
        }

        const foundOrder = data.orders[0]
        
        if (foundOrder.userId !== user.id) {
          setError('You are not authorized to view this order')
          setLoading(false)
          return
        }

        setOrder(foundOrder)
      } catch (err) {
        setError('Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [user, orderId, router])

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 animate-pulse">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-slate-200 rounded-full mb-4" />
                <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
                <div className="h-5 bg-slate-200 rounded w-64" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Unable to Load Order</h1>
              <p className="text-slate-600 mb-6">{error || 'Order not found'}</p>
              <Link href="/orders" className="btn-primary">
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (order.status === 'PENDING') {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card p-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Payment Pending</h1>
              <p className="text-slate-600 mb-6">Your payment is still being processed. If you haven&apos;t received an M-Pesa prompt, you can retry payment.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/checkout" className="btn-primary">
                  Retry Payment
                </Link>
                <Link href="/orders" className="btn-secondary">
                  View Order Status
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (order.status === 'CANCELLED') {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Order Cancelled</h1>
              <p className="text-slate-600 mb-6">This order was cancelled.</p>
              <Link href="/orders" className="btn-primary">
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase()

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card p-8 animate-fade-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-1">Order Confirmed!</h1>
              <p className="text-slate-600">Thank you for your purchase</p>
              <p className="text-lg font-mono font-semibold text-sky-600 mt-3">
                Order #{orderNumber}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">Confirmation sent!</p>
                  <p className="text-sm text-green-700">
                    A confirmation has been sent to your phone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/orders?highlight=${order.id}`} className="flex-1 btn-primary py-3 text-center">
                View Order Details
              </Link>
              <Link href={`/order-tracking?orderId=${order.id}`} className="flex-1 btn-secondary py-3 text-center">
                Track Order
              </Link>
              <Link href="/products" className="flex-1 btn-secondary py-3 text-center">
                Continue Shopping
              </Link>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.product.name}</p>
                    <p className="text-sm text-slate-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span>{formatPrice(order.subtotal || order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-sky-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-semibold mb-4">Payment & Delivery</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Method</span>
                <div className="text-right">
                  <span className="font-medium">M-Pesa</span>
                  {order.mpesaReceiptNumber && (
                    <p className="text-sm text-slate-500">Receipt: {order.mpesaReceiptNumber}</p>
                  )}
                </div>
              </div>

              {order.shippingAddress && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-600">Delivery Address</span>
                  <div className="text-right">
                    <p className="font-medium">{order.shippingAddress.name}</p>
                    <p className="text-sm text-slate-500">
                      {order.shippingAddress.address}<br />
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6 bg-sky-50 border-sky-200 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-semibold mb-4">What&apos;s Next?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-800">Estimated Delivery</p>
                  <p className="text-sm text-slate-600">{getEstimatedDelivery()}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-800">SMS Confirmation</p>
                  <p className="text-sm text-slate-600">You&apos;ll receive an SMS confirmation once your order ships.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                  {order.status}
                </div>
                <div className="pt-1">
                  <p className="text-sm text-slate-600">Order Status</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center p-4 text-sm text-slate-500">
            <p>Need help? Contact support with your order number {orderNumber}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderConfirmationLoading() {
  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 animate-pulse">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-slate-200 rounded-full mb-4" />
              <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-64" />
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderConfirmationWithParams() {
  useSearchParams()
  return <OrderConfirmationContent />
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<OrderConfirmationLoading />}>
      <OrderConfirmationWithParams />
    </Suspense>
  )
}