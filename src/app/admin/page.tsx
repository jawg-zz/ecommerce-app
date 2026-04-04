'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface Stats {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  totalCustomers: number
  newCustomers: number
  revenueChange: number
  averageOrderValue: number
}

interface Order {
  id: string
  user: { name: string; email: string }
  status: string
  total: number
  createdAt: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
  image: string | null
  totalSold?: number
}

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    newCustomers: 0,
    revenueChange: 0,
    averageOrderValue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'sales' | 'category' | 'status'>('sales')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [revenueByDay, setRevenueByDay] = useState<{ date: string; revenue: number; orders: number }[]>([])
  const [orderStatus, setOrderStatus] = useState<Record<string, number>>({})
  const [categoryDistribution, setCategoryDistribution] = useState<{ category: string; productCount: number }[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [analyticsRes, productsRes, ordersRes] = await Promise.all([
          fetch(`/api/admin/analytics?period=${period}`),
          fetch('/api/admin/products?limit=100'),
          fetch('/api/admin/orders?limit=5'),
        ])

        const analyticsData = await analyticsRes.json()
        const productsData = await productsRes.json()
        const ordersData = await ordersRes.json()

        if (analyticsData.summary) {
          setStats({
            totalProducts: analyticsData.summary.totalRevenue > 0 ? productsData.total || 0 : productsData.total || 0,
            totalOrders: analyticsData.summary.totalOrders || 0,
            pendingOrders: analyticsData.orderStatus?.PENDING || 0,
            totalRevenue: analyticsData.summary.totalRevenue || 0,
            totalCustomers: analyticsData.summary.totalCustomers || 0,
            newCustomers: analyticsData.summary.newCustomers || 0,
            revenueChange: analyticsData.summary.revenueChange || 0,
            averageOrderValue: analyticsData.summary.averageOrderValue || 0,
          })

          setRevenueByDay(analyticsData.revenueByDay || [])
          setOrderStatus(analyticsData.orderStatus || {})
          setCategoryDistribution(analyticsData.categoryDistribution || [])
          setLowStockAlerts(analyticsData.lowStockAlerts || [])
        }

        if (ordersData.orders) {
          setRecentOrders(ordersData.orders.slice(0, 5))
        }

        if (productsData.products) {
          setTopProducts(analyticsData.topProducts || productsData.products.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-sky-500',
      trend: stats.revenueChange,
      href: '/admin/orders',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-emerald-500',
      trend: null,
      href: '/admin/orders',
    },
    {
      label: 'Products',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'bg-violet-500',
      trend: null,
      href: '/admin/products',
    },
    {
      label: 'Customers',
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: 'bg-amber-500',
      trend: null,
      href: '/admin/customers',
    },
  ]

  const pieData = useMemo(() => {
    if (chartType === 'category') {
      return categoryDistribution.map((c) => ({
        name: c.category || 'Uncategorized',
        value: c.productCount,
      }))
    }
    return Object.entries(orderStatus).map(([name, value]) => ({
      name,
      value,
    }))
  }, [chartType, categoryDistribution, orderStatus])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back! Here&apos;s your store overview.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="card p-6 hover:shadow-lg transition-all duration-300 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                    {stat.trend !== null && (
                      <div className="mt-2">
                        <TrendIndicator value={stat.trend} label={`vs last ${period === '7d' ? 'week' : period === '30d' ? 'month' : 'quarter'}`} />
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Revenue Overview</h2>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['sales', 'category', 'status'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    chartType === type
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-80">
            {chartType === 'sales' ? (
              revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByDay}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatPrice(value * 100), 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No revenue data available
                </div>
              )
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {chartType !== 'sales' && pieData.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Pending Orders</h2>
            <Link
              href="/admin/orders?status=PENDING"
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))
            ) : recentOrders.filter((o) => o.status === 'PENDING').length > 0 ? (
              recentOrders
                .filter((o) => o.status === 'PENDING')
                .slice(0, 4)
                .map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {order.user.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No pending orders</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    </tr>
                  ))
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-slate-900">{order.user.name}</p>
                          <p className="text-xs text-slate-500">{order.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatPrice(order.total)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Top Products</h2>
            <Link
              href="/admin/products"
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))
            ) : topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-1 -left-1 w-5 h-5 bg-slate-900 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatPrice(product.price)}</p>
                    <p className="text-xs text-slate-500">{product.totalSold || product.stock} sold</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No products yet
              </div>
            )}
          </div>
        </div>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="card p-6 border-l-4 border-orange-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockAlerts.slice(0, 6).map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Package className="w-8 h-8 text-orange-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-orange-600">Only {product.stock} left</p>
                </div>
                <Link
                  href={`/admin/inventory?status=low_stock`}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Restock
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TrendIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0
  
  return (
    <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span className="font-medium">{Math.abs(value).toFixed(1)}%</span>
      <span className="text-slate-500">{label}</span>
    </div>
  )
}