'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/products?limit=1'),
        fetch('/api/admin/orders'),
      ])

      const productsData = await productsRes.json()
      const ordersData = await ordersRes.json()

      setStats({
        totalProducts: productsData.total || 0,
        totalOrders: ordersData.total || 0,
        pendingOrders: ordersData.orders?.filter((o: any) => o.status === 'PENDING').length || 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      href: '/admin/products',
      color: 'bg-blue-500',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      href: '/admin/orders',
      color: 'bg-emerald-500',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      href: '/admin/orders?status=PENDING',
      color: 'bg-amber-500',
    },
  ]

  return (
    <div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <p className="text-slate-500 text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
