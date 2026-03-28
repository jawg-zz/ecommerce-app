'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

export default function OrdersPage() {
  const { user } = useApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
      setLoading(false)
    }

    fetchOrders()
  }, [user])

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

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-8">My Orders</h1>

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
                      <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
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
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg mb-6">No orders yet.</p>
            <Link href="/products" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
