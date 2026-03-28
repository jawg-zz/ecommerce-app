'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'ELECTRONICS',
    image: '',
    stock: '0',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const res = await fetch('/api/admin/products')
    const data = await res.json()
    setProducts(data.products)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    const res = await fetch(url, {
      method: editingProduct ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      fetchProducts()
      resetForm()
    }
    setSaving(false)
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
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    fetchProducts()
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
  }

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Products</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input-field"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="CLOTHING">Clothing</option>
                  <option value="BOOKS">Books</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                  Price
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                  Stock
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium text-slate-900">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        categoryColors[product.category]
                      }`}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-500 hover:text-blue-600 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
