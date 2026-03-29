'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { validatePrice, validateStock, isNetworkError } from '@/lib/validation'
import { Modal, ConfirmModal } from '@/components/admin/Modal'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Image as ImageIcon,
  Package,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
  createdAt: string
}

interface FormErrors {
  name?: string
  price?: string
  stock?: string
  image?: string
}

interface Filters {
  search: string
  category: string
  stockStatus: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    stockStatus: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  })

  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'ELECTRONICS',
    image: '',
    stock: '0',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    let result = [...products]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.category) {
      result = result.filter((p) => p.category === filters.category)
    }

    if (filters.stockStatus) {
      if (filters.stockStatus === 'IN_STOCK') {
        result = result.filter((p) => p.stock > 5)
      } else if (filters.stockStatus === 'LOW_STOCK') {
        result = result.filter((p) => p.stock > 0 && p.stock <= 5)
      } else if (filters.stockStatus === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stock === 0)
      }
    }

    result.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof Product]
      const bValue = b[filters.sortBy as keyof Product]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    setFilteredProducts(result)
    setPagination((prev) => ({ ...prev, total: result.length }))
  }, [products, filters])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100')
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      showToast('Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (touched[name]) {
      validateField(name as keyof FormErrors, value)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    validateField(name as keyof FormErrors, formData[name as keyof typeof formData])
  }

  const validateField = (field: keyof FormErrors, value: string) => {
    let error: string | undefined

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Product name is required'
        } else if (value.trim().length < 2) {
          error = 'Product name must be at least 2 characters'
        }
        break
      case 'price':
        if (!value) {
          error = 'Price is required'
        } else {
          const validation = validatePrice(value)
          if (!validation.isValid) {
            error = validation.error
          }
        }
        break
      case 'stock':
        if (value === '') {
          error = 'Stock is required'
        } else {
          const validation = validateStock(value)
          if (!validation.isValid) {
            error = validation.error
          }
        }
        break
      case 'image':
        if (value && !value.startsWith('http')) {
          error = 'Please enter a valid URL'
        }
        break
    }

    setErrors((prev) => ({ ...prev, [field]: error }))
    return !error
  }

  const isFormValid = () => {
    const nameValid = validateField('name', formData.name)
    const priceValid = validateField('price', formData.price)
    const stockValid = validateField('stock', formData.stock)
    const imageValid = validateField('image', formData.image)

    return nameValid && priceValid && stockValid && imageValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setTouched({ name: true, price: true, stock: true, image: true })

    const nameValid = validateField('name', formData.name)
    const priceValid = validateField('price', formData.price)
    const stockValid = validateField('stock', formData.stock)
    const imageValid = validateField('image', formData.image)

    if (!nameValid || !priceValid || !stockValid || !imageValid) {
      return
    }

    if (saving) return

    setSaving(true)

    const payload = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category,
      image: formData.image || null,
      stock: parseInt(formData.stock),
    }

    const url = editingProduct
      ? `/api/admin/products/${editingProduct.id}`
      : '/api/admin/products'

    try {
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to save product', 'error')
        return
      }

      showToast(editingProduct ? 'Product updated successfully' : 'Product created successfully', 'success')
      fetchProducts()
      resetForm()
    } catch (err) {
      if (isNetworkError(err)) {
        showToast('Unable to connect. Please check your connection.', 'error')
      } else {
        showToast('Failed to save product. Please try again.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      image: product.image || '',
      stock: product.stock.toString(),
    })
    setShowForm(true)
    setTouched({})
    setErrors({})
  }

  const handleDelete = async (id: string) => {
    setProductToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      const res = await fetch(`/api/admin/products/${productToDelete}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || 'Failed to delete product', 'error')
        return
      }

      showToast('Product deleted successfully', 'success')
      fetchProducts()
    } catch {
      showToast('Failed to delete product. Please try again.', 'error')
    } finally {
      setShowDeleteModal(false)
      setProductToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    setSaving(true)
    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
        )
      )
      showToast(`${selectedProducts.length} products deleted successfully`, 'success')
      setSelectedProducts([])
      fetchProducts()
    } catch {
      showToast('Failed to delete products', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'Category', 'Price', 'Stock', 'Description']
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map((p) =>
        [p.name, p.category, p.price, p.stock, p.description || ''].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products.csv'
    a.click()
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'ELECTRONICS',
      image: '',
      stock: '0',
    })
    setTouched({})
    setErrors({})
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'OUT_OF_STOCK'
    if (stock <= 5) return 'LOW_STOCK'
    return 'IN_STOCK'
  }

  const paginatedProducts = filteredProducts.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  )

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }))
  }

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) return null
    return filters.sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
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
          <h2 className="text-xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your product inventory</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              setShowForm(true)
              setTouched({})
              setErrors({})
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 mb-6 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="input-field pl-9"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              className="input-field"
            >
              <option value="">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="CLOTHING">Clothing</option>
              <option value="BOOKS">Books</option>
            </select>
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, stockStatus: e.target.value }))}
              className="input-field"
            >
              <option value="">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [string, 'asc' | 'desc']
                setFilters((prev) => ({ ...prev, sortBy, sortOrder }))
              }}
              className="input-field"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="stock-desc">Stock: High to Low</option>
            </select>
          </div>
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="card p-4 mb-6 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sky-700 font-medium">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={saving}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedProducts([])}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.name && errors.name ? 'border-red-500' : ''}`}
                  placeholder="Product name"
                />
                {touched.name && errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.price && errors.price ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {touched.price && errors.price && (
                  <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows={4}
                placeholder="Product description..."
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="CLOTHING">Clothing</option>
                  <option value="BOOKS">Books</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  value={formData.stock}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.stock && errors.stock ? 'border-red-500' : ''}`}
                />
                {touched.stock && errors.stock && (
                  <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.image && errors.image ? 'border-red-500' : ''}`}
                  placeholder="https://..."
                />
                {touched.image && errors.image && (
                  <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                )}
              </div>
            </div>

            {formData.image && (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <span className="text-sm text-slate-500">Image preview</span>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length > 0 && selectedProducts.length === products.length}
                    onChange={() => {
                      if (selectedProducts.length === products.length) {
                        setSelectedProducts([])
                      } else {
                        setSelectedProducts(products.map((p) => p.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Product {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-2">
                    Category {getSortIcon('category')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price {getSortIcon('price')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center gap-2">
                    Stock {getSortIcon('stock')}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="w-4 h-4 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-200 rounded" /><div className="h-4 bg-slate-200 rounded w-32" /></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-12" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No products found</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => {
                          if (selectedProducts.includes(product.id)) {
                            setSelectedProducts(selectedProducts.filter((id) => id !== product.id))
                          } else {
                            setSelectedProducts([...selectedProducts, product.id])
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[product.category]}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-900 font-medium">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={getStockStatus(product.stock)} size="sm" />
                        <span className="text-sm text-slate-600">{product.stock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-sky-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-600 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Show</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
                className="px-2 py-1 border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>of {filteredProducts.length} entries</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4 rotate-270" />
              </button>
              <span className="px-3 text-sm text-slate-600">
                Page {pagination.page} of {Math.ceil(filteredProducts.length / pagination.pageSize)}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= Math.ceil(filteredProducts.length / pagination.pageSize)}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4 -rotate-270" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.ceil(filteredProducts.length / pagination.pageSize) }))}
                disabled={pagination.page >= Math.ceil(filteredProducts.length / pagination.pageSize)}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  )
}
