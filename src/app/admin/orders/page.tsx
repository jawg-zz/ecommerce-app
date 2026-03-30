'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { isNetworkError } from '@/lib/validation'
import { Modal, ConfirmModal } from '@/components/admin/Modal'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  User,
  MapPin,
  Phone,
  Mail,
  Printer,
  MoreVertical,
  RefreshCw,
} from 'lucide-react'

interface OrderItem {
  id: string
  productId: string
  product: {
    name: string
    image?: string
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
    phone?: string
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
    phone?: string
  } | null
  createdAt: string
  updatedAt: string
}

const statusSteps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED']

const statusIcons: Record<string, React.ElementType> = {
  PENDING: Clock,
  PAID: CheckCircle,
  SHIPPED: Truck,
  DELIVERED: Package,
  CANCELLED: XCircle,
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-sky-100 text-sky-700 border-sky-200',
  SHIPPED: 'bg-purple-100 text-purple-700 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

function AdminOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [dateRange, setDateRange] = useState('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  const statusFilter = searchParams.get('status') || ''

  useEffect(() => {
    fetchOrders()
  }, [statusFilter, page, dateRange, customDateFrom, customDateTo])

  useEffect(() => {
    let result = [...orders]

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.user.name.toLowerCase().includes(query) ||
          o.user.email.toLowerCase().includes(query)
      )
    }

    setFilteredOrders(result)
  }, [orders, statusFilter, searchQuery])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      if (dateRange !== 'all') params.set('dateRange', dateRange)
      if (dateRange === 'custom' && customDateFrom) params.set('dateFrom', customDateFrom)
      if (dateRange === 'custom' && customDateTo) params.set('dateTo', customDateTo)

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()

      if (!res.ok) {
        toast.success(data.error || 'Failed to load orders')
        return
      }

      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      toast.success('Failed to load orders. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.success(data.error || 'Failed to update order status')
        setUpdating(null)
        return
      }

      toast.success('Order status updated successfully')
      fetchOrders()
    } catch {
      toast.success('Failed to update order. Please check your connection.')
    } finally {
      setUpdating(null)
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedOrders.length === 0) return

    setUpdating('bulk')
    try {
      await Promise.all(
        selectedOrders.map((orderId) =>
          fetch(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      )

      toast.success(`${selectedOrders.length} orders updated to ${bulkStatus}`)
      setSelectedOrders([])
      setShowBulkUpdateModal(false)
      setBulkStatus('')
      fetchOrders()
    } catch {
      toast.success('Failed to update orders')
    } finally {
      setUpdating(null)
    }
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

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const printInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.product.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatPrice(item.price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
        </tr>
      `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .invoice-title { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f8fafc; padding: 12px; text-align: left; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="invoice-title">INVOICE</h1>
              <p>Order #${order.id.slice(0, 8)}</p>
              <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h3>Customer</h3>
              <p>${order.user.name}</p>
              <p>${order.user.email}</p>
            </div>
          </div>
          
          ${order.shippingAddress ? `
          <div style="margin-bottom: 30px;">
            <h3>Shipping Address</h3>
            <p>${order.shippingAddress.name}</p>
            <p>${order.shippingAddress.address}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
          </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p class="total">Total: ${formatPrice(order.total)}</p>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  const getStatusStepIndex = (status: string) => statusSteps.indexOf(status)

  const statusOptions = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and track customer orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {selectedOrders.length > 0 && (
        <div className="card p-4 mb-6 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-sky-700 font-medium">
              {selectedOrders.length} order(s) selected
            </span>
            <div className="flex gap-2 flex-wrap">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="input-field py-1.5"
              >
                <option value="">Change status to...</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={() => setShowBulkUpdateModal(true)}
                disabled={!bulkStatus || updating === 'bulk'}
                className="btn-primary py-1.5 disabled:opacity-50"
              >
                Update All
              </button>
              <button
                onClick={() => setSelectedOrders([])}
                className="btn-secondary py-1.5"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleStatusFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !statusFilter
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All Orders
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              statusFilter === status
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {status}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              statusFilter === status ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {orders.filter((o) => o.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Date:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field py-1.5 w-36"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="input-field py-1.5"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="input-field py-1.5"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentStepIndex = getStatusStepIndex(order.status)
            const isExpanded = expandedOrders.has(order.id)

            return (
              <div key={order.id} className="card overflow-hidden">
                <div
                  className="p-4 lg:p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (selectedOrders.includes(order.id)) {
                            setSelectedOrders(selectedOrders.filter((id) => id !== order.id))
                          } else {
                            setSelectedOrders([...selectedOrders, order.id])
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-slate-900">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {order.user.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {order.user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {statusSteps.map((status, index) => {
                          const StatusIcon = statusIcons[status]
                          const isCompleted = index <= currentStepIndex
                          const isCurrent = index === currentStepIndex

                          return (
                            <div key={status} className="flex items-center flex-1">
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                  isCompleted
                                    ? statusColors[status]
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                <StatusIcon className="w-4 h-4" />
                                <span className="text-xs font-medium hidden sm:inline">{status}</span>
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div
                                  className={`flex-1 h-0.5 mx-2 ${
                                    index < currentStepIndex ? 'bg-sky-500' : 'bg-slate-200'
                                  }`}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 lg:p-6 bg-slate-50 animate-slide-down">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Order Items</h4>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 bg-white p-3 rounded-lg"
                            >
                              <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden relative">
                                {item.product.image ? (
                                  <Image
                                    src={item.product.image}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-6 h-6 text-slate-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                <p className="text-sm text-slate-500">
                                  {formatPrice(item.price)} × {item.quantity}
                                </p>
                              </div>
                              <p className="font-semibold text-slate-900">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
                          <span className="font-semibold text-slate-700">Total</span>
                          <span className="font-bold text-lg text-slate-900">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {order.shippingAddress && (
                          <div className="bg-white p-4 rounded-lg">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Shipping Address
                            </h4>
                            <div className="text-sm text-slate-600 space-y-1">
                              <p className="font-medium text-slate-900">
                                {order.shippingAddress.name}
                              </p>
                              <p>{order.shippingAddress.address}</p>
                              <p>
                                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                {order.shippingAddress.zipCode}
                              </p>
                              {order.shippingAddress.phone && (
                                <p className="flex items-center gap-1 mt-2">
                                  <Phone className="w-3 h-3" />
                                  {order.shippingAddress.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-slate-900 mb-3">Quick Actions</h4>
                          <div className="space-y-2">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                              disabled={updating === order.id}
                              className="input-field"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => openOrderDetails(order)}
                              className="btn-secondary w-full justify-center flex items-center gap-2"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => printInvoice(order)}
                              className="btn-secondary w-full justify-center flex items-center gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              Print Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4">
              <span className="text-sm text-slate-500">
                Showing {orders.length} of {total} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No orders found</h3>
          <p className="text-slate-500">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Orders will appear here when customers make purchases'}
          </p>
        </div>
      )}

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Order #${selectedOrder?.id.slice(0, 8)}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <StatusBadge status={selectedOrder.status} />
              <span className="text-sm text-slate-500">
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Customer</h4>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-medium text-slate-900">{selectedOrder.user.name}</p>
                  <p className="text-sm text-slate-600">{selectedOrder.user.email}</p>
                  {selectedOrder.user.phone && (
                    <p className="text-sm text-slate-600">{selectedOrder.user.phone}</p>
                  )}
                </div>
              </div>

              {selectedOrder.shippingAddress && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Shipping Address</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="font-medium text-slate-900">
                      {selectedOrder.shippingAddress.name}
                    </p>
                    <p className="text-sm text-slate-600">{selectedOrder.shippingAddress.address}</p>
                    <p className="text-sm text-slate-600">
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.zipCode}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <h4 className="font-semibold text-slate-900 mb-3">Order Items</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Product</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-slate-600">Qty</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Price</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-900">{item.product.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                        {formatPrice(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                      Total
                    </td>
                    <td className="px-4 py-3 text-base font-bold text-slate-900 text-right">
                      {formatPrice(selectedOrder.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => printInvoice(selectedOrder)}
                className="btn-secondary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
              <button
                onClick={() => {
                  handleStatusUpdate(selectedOrder.id, 'DELIVERED')
                  setShowDetailsModal(false)
                }}
                disabled={selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'CANCELLED'}
                className="btn-primary disabled:opacity-50"
              >
                Mark as Delivered
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        onConfirm={handleBulkStatusUpdate}
        title="Bulk Update Orders"
        message={`Are you sure you want to update ${selectedOrders.length} order(s) to ${bulkStatus}?`}
        confirmLabel="Update"
        loading={updating === 'bulk'}
      />
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  )
}
