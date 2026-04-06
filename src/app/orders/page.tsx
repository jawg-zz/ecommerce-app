'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from '@/components/Providers'
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
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  items: OrderItem[]
  total: number
  createdAt: string
}

function OrdersContent() {
  const { user } = useApp()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const statusFilter = searchParams.get('status') || ''

  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      
      const res = await fetch(`/api/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setTotalPages(data.totalPages || 1)
      }
      setLoading(false)
    }

    fetchOrders()
  }, [user, statusFilter, page])

  if (!user) {
    return (
      <div className="py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">My Orders</h1>
          <p className="text-slate-500 mb-6">Please sign in to view your orders.</p>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  const statusOptions = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  const getFilterUrl = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    return `/orders?${params.toString()}`
  }

  const getStatusMessage = () => {
    if (loading) return 'Loading your orders...'
    if (orders.length === 0) {
      return statusFilter ? `No ${statusFilter.toLowerCase()} orders yet.` : 'No orders yet.'
    }
    return `Showing ${orders.length} order${orders.length !== 1 ? 's' : ''}`
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {getStatusMessage()}
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/orders"
              className={`px-3 py-1 rounded-full text-sm ${
                !statusFilter
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              All
            </Link>
            {statusOptions.map((status) => (
              <Link
                key={status}
                href={getFilterUrl(status)}
                className={`px-3 py-1 rounded-full text-sm ${
                  statusFilter === status
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {status}
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[order.status]
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3">
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
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-blue-600">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg mb-6">
              {statusFilter ? `No ${statusFilter.toLowerCase()} orders yet.` : 'No orders yet.'}
            </p>
            <Link href="/products" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="py-8">
        <div className="container-custom">
          <h1 className="text-2xl font-bold mb-8">My Orders</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}