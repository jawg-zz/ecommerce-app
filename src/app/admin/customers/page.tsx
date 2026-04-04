'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { Modal } from '@/components/admin/Modal'
import {
  Search,
  Filter,
  Download,
  Mail,
  ShoppingCart,
  Calendar,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  User,
} from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string | null
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'totalOrders' | 'lastOrder'>('lastOrder')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchCustomers()
  }, [search, sort, page])

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)

      const res = await fetch(`/api/admin/customers?${params}`)
      const data = await res.json()

      setCustomers(data.customers || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const sortedCustomers = [...customers].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'totalSpent':
        comparison = a.totalSpent - b.totalSpent
        break
      case 'totalOrders':
        comparison = a.totalOrders - b.totalOrders
        break
      case 'lastOrder':
        const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0
        const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0
        comparison = aDate - bDate
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (column: 'name' | 'totalSpent' | 'totalOrders' | 'lastOrder') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const exportCustomers = () => {
    const headers = ['Name', 'Email', 'Total Orders', 'Total Spent', 'Member Since', 'Last Order']
    const csvContent = [
      headers.join(','),
      ...sortedCustomers.map((c) =>
        [
          `"${c.name.replace(/"/g, '""')}"`,
          c.email,
          c.totalOrders,
          (c.totalSpent / 100).toFixed(2),
          new Date(c.createdAt).toLocaleDateString(),
          c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Never',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and view customer information</p>
        </div>
        <button
          onClick={exportCustomers}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-field md:w-48"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : sortedCustomers.length > 0 ? (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Customer {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('totalOrders')}
                    >
                      <div className="flex items-center gap-2">
                        Orders {getSortIcon('totalOrders')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('totalSpent')}
                    >
                      <div className="flex items-center gap-2">
                        Total Spent {getSortIcon('totalSpent')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort('lastOrder')}
                    >
                      <div className="flex items-center gap-2">
                        Last Order {getSortIcon('lastOrder')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{customer.name}</p>
                            <p className="text-sm text-slate-500">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{customer.totalOrders}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">
                          {formatPrice(customer.totalSpent)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {customer.lastOrderDate ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(customer.lastOrderDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No orders yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`mailto:${customer.email}`}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowDetailsModal(true)
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            title="View Details"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4">
              <span className="text-sm text-slate-500">
                Showing {customers.length} of {total} customers
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
        </>
      ) : (
        <div className="card p-12 text-center">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No customers found</h3>
          <p className="text-slate-500">
            {search ? 'Try adjusting your search' : 'Customers will appear here when they register'}
          </p>
        </div>
      )}

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedCustomer(null)
        }}
        title="Customer Details"
      >
        {selectedCustomer && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-sky-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-slate-500">{selectedCustomer.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">{selectedCustomer.totalOrders}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Total Spent</p>
                <p className="text-2xl font-bold text-slate-900">{formatPrice(selectedCustomer.totalSpent)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Member Since</p>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Last Order</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedCustomer.lastOrderDate
                    ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString()
                    : 'No orders'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`mailto:${selectedCustomer.email}`}
                className="flex-1 btn-primary justify-center flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}