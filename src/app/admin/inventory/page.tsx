'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { Modal, ConfirmModal } from '@/components/admin/Modal'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  Download,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
  image: string | null
  averageRating?: number
  reviewCount?: number
  createdAt: string
}

interface Summary {
  total: number
  totalStock: number
  inStock: number
  lowStock: number
  outOfStock: number
  lowStockPercentage: number
  outOfStockPercentage: number
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchInventory()
  }, [filter])

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      
      const res = await fetch(`/api/admin/inventory?${params}`)
      const data = await res.json()
      
      setProducts(data.products || [])
      setSummary(data.summary)
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const updateStock = async (productId: string, operation: 'add' | 'remove' | 'set', value?: number) => {
    setUpdating(productId)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, operation, stock: value }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to update stock')
        return
      }

      toast.success('Stock updated successfully')
      fetchInventory()
    } catch {
      toast.error('Failed to update stock')
    } finally {
      setUpdating(null)
    }
  }

  const filteredProducts = useMemo(() => {
    if (!search) return products
    const searchLower = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
    )
  }, [products, search])

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out_of_stock'
    if (stock <= 5) return 'low_stock'
    return 'in_stock'
  }

  const getStockBadge = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700' }
    if (stock <= 5) return { label: 'Low Stock', class: 'bg-orange-100 text-orange-700' }
    return { label: 'In Stock', class: 'bg-green-100 text-green-700' }
  }

  const exportInventory = () => {
    const headers = ['Name', 'Category', 'Price', 'Stock', 'Status', 'Rating']
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map((p) =>
        [
          `"${p.name.replace(/"/g, '""')}"`,
          p.category,
          p.price / 100,
          p.stock,
          getStockStatus(p.stock),
          p.averageRating?.toFixed(1) || 'N/A',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-slate-500 text-sm mt-1">Track and manage product stock levels</p>
        </div>
        <button
          onClick={exportInventory}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {!loading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Package className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
                <p className="text-sm text-slate-500">Total Products</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.totalStock}</p>
                <p className="text-sm text-slate-500">Total Units</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.inStock}</p>
                <p className="text-sm text-slate-500">In Stock</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.lowStock}</p>
                <p className="text-sm text-slate-500">Low Stock</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.outOfStock}</p>
                <p className="text-sm text-slate-500">Out of Stock</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.lowStockPercentage}%</p>
                <p className="text-sm text-slate-500">Low Stock Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : f === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const badge = getStockBadge(product.stock)
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
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
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            {product.averageRating !== undefined && product.averageRating > 0 && (
                              <p className="text-xs text-slate-500">
                                ★ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[product.category] || ''}`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStock(product.id, 'remove', 1)}
                            disabled={updating === product.id || product.stock === 0}
                            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-12 text-center font-semibold">{product.stock}</span>
                          <button
                            onClick={() => updateStock(product.id, 'add', 1)}
                            disabled={updating === product.id}
                            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              setShowEditModal(true)
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            title="Edit Stock"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-500">
            {search ? 'Try adjusting your search' : 'No products in this category'}
          </p>
        </div>
      )}

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingProduct(null)
        }}
        title="Update Stock"
      >
        {editingProduct && (
          <div className="p-6">
            <p className="text-slate-900 font-medium mb-4">{editingProduct.name}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateStock(editingProduct.id, 'remove', 10)}
                  disabled={updating === editingProduct.id}
                  className="btn-secondary"
                >
                  -10
                </button>
                <span className="text-2xl font-bold">{editingProduct.stock}</span>
                <button
                  onClick={() => updateStock(editingProduct.id, 'add', 10)}
                  disabled={updating === editingProduct.id}
                  className="btn-secondary"
                >
                  +10
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  id="stockInput"
                  placeholder="Set specific amount"
                  className="input-field flex-1"
                  min="0"
                />
                <button
                  onClick={() => {
                    const value = parseInt((document.getElementById('stockInput') as HTMLInputElement).value)
                    if (!isNaN(value) && value >= 0) {
                      updateStock(editingProduct.id, 'set', value)
                      setShowEditModal(false)
                      setEditingProduct(null)
                    }
                  }}
                  disabled={updating === editingProduct.id}
                  className="btn-primary"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}