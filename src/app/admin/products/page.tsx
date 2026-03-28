'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { validatePrice, validateStock, isNetworkError } from '@/lib/validation'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

interface FormErrors {
  name?: string
  price?: string
  stock?: string
  image?: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

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

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(data.products)
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
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error || 'Failed to delete product', 'error')
        return
      }
      
      showToast('Product deleted successfully', 'success')
      fetchProducts()
    } catch {
      showToast('Failed to delete product. Please try again.', 'error')
    }
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
          onClick={() => {
            setShowForm(true)
            setTouched({})
            setErrors({})
          }}
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.name && errors.name ? 'border-red-500' : ''}`}
                />
                {touched.name && errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                />
                {touched.price && errors.price && (
                  <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
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

            <div className="flex gap-4">
              <button 
                type="submit" 
                disabled={saving} 
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
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
                  <td className="px-4 py-3">
                    <span className={product.stock === 0 ? 'text-red-500' : product.stock <= 5 ? 'text-orange-500' : ''}>
                      {product.stock}
                    </span>
                  </td>
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
