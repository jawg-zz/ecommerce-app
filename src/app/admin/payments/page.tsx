'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { toast } from 'react-hot-toast'
import type { ShippingAddress } from '@/lib/types'

interface Stats {
  totalRevenue: number
  successRate: number
  paidCount: number
  pendingCount: number
  cancelledCount: number
  failedCount: number
  totalOrders: number
  trendData: Array<{
    date: string
    paid: number
    pending: number
    cancelled: number
    revenue: number
  }>
}

interface Transaction {
  id: string
  orderId: string
  reference: string | null
  customerName: string
  customerEmail: string
  amount: number
  status: string
  mpesaReceipt: string | null
  phone: string | null
  cancelReason: string | null
  paymentMethod: string
  createdAt: string
  updatedAt: string
  customer?: {
    name: string
    email: string
  }
  mpesaCheckoutRequestId?: string
  mpesaMerchantRequestId?: string
  stripePaymentId?: string
  shippingAddress?: ShippingAddress
  items?: Array<{
    id: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

const statusColors: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  SHIPPED: 'bg-sky-100 text-sky-700 border-sky-200',
  DELIVERED: 'bg-purple-100 text-purple-700 border-purple-200',
}

function PaymentsContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [period])

  useEffect(() => {
    fetchTransactions()
  }, [page, statusFilter, dateRange, customDateFrom, customDateTo])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      const res = await fetch(`/api/admin/payments/stats?${params}`)
      const data = await res.json()
      if (res.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter) params.set('status', statusFilter)
      if (dateRange !== 'all') params.set('dateRange', dateRange)
      if (dateRange === 'custom') {
        if (customDateFrom) params.set('dateFrom', customDateFrom)
        if (customDateTo) params.set('dateTo', customDateTo)
      }

      const res = await fetch(`/api/admin/payments/transactions?${params}`)
      const data = await res.json()
      if (res.ok) {
        setTransactions(data.transactions || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchTransactions()
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      params.set('export', 'csv')
      if (statusFilter) params.set('status', statusFilter)
      if (dateRange !== 'all') params.set('dateRange', dateRange)
      if (dateRange === 'custom') {
        if (customDateFrom) params.set('dateFrom', customDateFrom)
        if (customDateTo) params.set('dateTo', customDateTo)
      }

      const res = await fetch(`/api/admin/payments/transactions?${params}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Export started')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export')
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const viewTransactionDetails = async (transaction: Transaction) => {
    try {
      const res = await fetch(`/api/admin/payments/${transaction.orderId}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedTransaction(data)
        setShowDetailsModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error)
    }
  }

  const pieData = stats
    ? [
        { name: 'Paid', value: stats.paidCount, color: '#10b981' },
        { name: 'Pending', value: stats.pendingCount, color: '#f59e0b' },
        { name: 'Cancelled', value: stats.cancelledCount, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor payment transactions and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              {loadingStats ? (
                <div className="h-8 bg-slate-100 rounded w-24 animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatPrice(stats?.totalRevenue || 0)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Success Rate</p>
              {loadingStats ? (
                <div className="h-8 bg-slate-100 rounded w-16 animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.successRate || 0}%</p>
              )}
            </div>
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              {loadingStats ? (
                <div className="h-8 bg-slate-100 rounded w-16 animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.pendingCount || 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Failed/Cancelled</p>
              {loadingStats ? (
                <div className="h-8 bg-slate-100 rounded w-16 animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.cancelledCount || 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Trends</h3>
          {loadingStats ? (
            <div className="h-64 bg-slate-50 rounded animate-pulse" />
          ) : stats?.trendData && stats.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="paid" name="Paid" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Over Time</h3>
          {loadingStats ? (
            <div className="h-64 bg-slate-50 rounded animate-pulse" />
          ) : stats?.trendData && stats.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `KES ${value / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value: number) => [formatPrice(value), 'Revenue']}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order ID, receipt, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <button
              onClick={fetchTransactions}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Method</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">M-Pesa Receipt</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className="font-mono text-xs">{tx.orderId.slice(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="text-slate-900 font-medium">{tx.customerName}</p>
                          <p className="text-slate-500 text-xs">{tx.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                          {formatPrice(tx.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[tx.status] || 'bg-slate-100 text-slate-600'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{tx.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className="font-mono text-xs">{tx.mpesaReceipt || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => viewTransactionDetails(tx)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-3 text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Transaction Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Order ID</p>
                  <p className="font-mono text-sm text-slate-900">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Reference</p>
                  <p className="text-sm text-slate-900">{selectedTransaction.reference || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="text-sm text-slate-900">{selectedTransaction.customer?.name}</p>
                  <p className="text-xs text-slate-500">{selectedTransaction.customer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-lg font-bold text-slate-900">{formatPrice(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${statusColors[selectedTransaction.status]}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Method</p>
                  <p className="text-sm text-slate-900">{selectedTransaction.paymentMethod}</p>
                </div>
                {selectedTransaction.mpesaCheckoutRequestId && (
                  <div>
                    <p className="text-sm text-slate-500">M-Pesa Checkout Request ID</p>
                    <p className="font-mono text-xs text-slate-900">{selectedTransaction.mpesaCheckoutRequestId}</p>
                  </div>
                )}
                {selectedTransaction.mpesaMerchantRequestId && (
                  <div>
                    <p className="text-sm text-slate-500">M-Pesa Merchant Request ID</p>
                    <p className="font-mono text-xs text-slate-900">{selectedTransaction.mpesaMerchantRequestId}</p>
                  </div>
                )}
                {selectedTransaction.stripePaymentId && (
                  <div>
                    <p className="text-sm text-slate-500">Stripe Payment ID</p>
                    <p className="font-mono text-xs text-slate-900">{selectedTransaction.stripePaymentId}</p>
                  </div>
                )}
                {selectedTransaction.cancelReason && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Failure Reason</p>
                    <p className="text-sm text-red-600">{selectedTransaction.cancelReason}</p>
                  </div>
                )}
                {selectedTransaction.shippingAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Shipping Address</p>
                    <div className="text-sm text-slate-900 mt-1">
                      <p>{selectedTransaction.shippingAddress.name}</p>
                      <p>{selectedTransaction.shippingAddress.address}</p>
                      <p>{selectedTransaction.shippingAddress.city}, {selectedTransaction.shippingAddress.state} {selectedTransaction.shippingAddress.zipCode}</p>
                      <p>Phone: {selectedTransaction.shippingAddress.phone || '-'}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="text-sm text-slate-900">{formatDateTime(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Updated</p>
                  <p className="text-sm text-slate-900">{formatDateTime(selectedTransaction.updatedAt)}</p>
                </div>
              </div>

              {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Order Items</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTransaction.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-slate-900">{item.productName}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{formatPrice(item.unitPrice)}</td>
                            <td className="px-4 py-2 text-sm text-slate-900 font-medium">{formatPrice(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  )
}