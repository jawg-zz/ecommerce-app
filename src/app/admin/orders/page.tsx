'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: string
  productId: string
  product: {
    name: string
  }
  quantity: number
  price: number
}

interface Order {
  id: string
  user: {
    id: string
    email: string
    name: string
  }
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  items: OrderItem[]
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

function AdminOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const statusFilter = searchParams.get('status') || ''

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)

    const res = await fetch(`/api/admin/orders?${params}`)
    const data = await res.json()
    setOrders(data.orders)
    setLoading(false)
  }

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdating(orderId)
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchOrders()
    setUpdating(null)
  }

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    router.push(`/admin/orders?${params.toString()}`)
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  const statusOptions = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Orders</h2>

        <div className="flex gap-2">
          <button
            onClick={() => handleStatusFilter('')}
            className={`px-3 py-1 rounded-full text-sm ${
              !statusFilter
                ? 'bg-slate-800 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            All
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                statusFilter === status
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-slate-500">
                    {order.user.name} ({order.user.email})
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusUpdate(order.id, e.target.value)
                    }
                    disabled={updating === order.id}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${
                      statusColors[order.status]
                    }`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Items</h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.product.name} × {item.quantity}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {order.shippingAddress && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-1">
                    Shipping Address
                  </h4>
                  <p className="text-sm text-slate-500">
                    {order.shippingAddress.name}
                    <br />
                    {order.shippingAddress.address}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 mt-4 flex justify-between">
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
          <p className="text-slate-500">No orders found.</p>
        </div>
      )}
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  )
}
