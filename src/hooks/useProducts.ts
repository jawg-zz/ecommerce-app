'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { validatePrice, validateStock, isNetworkError } from '@/lib/validation'

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
  createdAt: string
}

export interface FormErrors {
  name?: string
  price?: string
  stock?: string
  image?: string
}

export interface Filters {
  search: string
  category: string
  stockStatus: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface FormData {
  name: string
  description: string
  price: string
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string
  stock: string
}

export interface UseProductsReturn {
  products: Product[]
  filteredProducts: Product[]
  loading: boolean
  formData: FormData
  errors: FormErrors
  touched: Record<string, boolean>
  saving: boolean
  uploading: boolean
  showForm: boolean
  editingProduct: Product | null
  filters: Filters
  pagination: Pagination
  paginatedProducts: Product[]
  selectedProducts: string[]
  showDeleteModal: boolean
  productToDelete: string | null
  fetchProducts: () => Promise<void>
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>
  handleSort: (column: string) => void
  handleSelectAll: () => void
  handleSelectProduct: (id: string) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleEdit: (product: Product) => void
  handleDelete: (id: string) => void
  confirmDelete: () => Promise<void>
  handleBulkDelete: () => Promise<void>
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  resetForm: () => void
  openForm: () => void
  handleExportCSV: () => void
}

const initialFormData: FormData = {
  name: '',
  description: '',
  price: '',
  category: 'ELECTRONICS',
  image: '',
  stock: '0',
}

const initialFilters: Filters = {
  search: '',
  category: '',
  stockStatus: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [filters, setFilters] = useState<Filters>(initialFilters)

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
  })

  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [uploading, setUploading] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100')
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const handleOpenForm = () => {
      setShowForm(true)
      setTouched({})
      setErrors({})
    }

    window.addEventListener('openProductForm', handleOpenForm)
    return () => window.removeEventListener('openProductForm', handleOpenForm)
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

  const validateField = useCallback((field: keyof FormErrors, value: string): boolean => {
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
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (touched[name]) {
      validateField(name as keyof FormErrors, value)
    }
  }, [touched, validateField])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    validateField(name as keyof FormErrors, formData[name as keyof typeof formData])
  }, [formData, validateField])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to save product')
        return
      }

      toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully')
      fetchProducts()
      resetForm()
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error('Unable to connect. Please check your connection.')
      } else {
        toast.error('Failed to save product. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }, [formData, editingProduct, saving, fetchProducts])

  const handleEdit = useCallback((product: Product) => {
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
  }, [])

  const handleDelete = useCallback((id: string) => {
    setProductToDelete(id)
    setShowDeleteModal(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!productToDelete) return

    try {
      const res = await fetch(`/api/admin/products/${productToDelete}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete product')
        return
      }

      toast.success('Product deleted successfully')
      fetchProducts()
    } catch {
      toast.error('Failed to delete product. Please try again.')
    } finally {
      setShowDeleteModal(false)
      setProductToDelete(null)
    }
  }, [productToDelete, fetchProducts])

  const handleBulkDelete = useCallback(async () => {
    if (selectedProducts.length === 0) return

    setSaving(true)
    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: 'DELETE',
          })
        )
      )
      toast.success(`${selectedProducts.length} products deleted successfully`)
      setSelectedProducts([])
      fetchProducts()
    } catch {
      toast.error('Failed to delete products')
    } finally {
      setSaving(false)
    }
  }, [selectedProducts, fetchProducts])

  const handleExportCSV = useCallback(() => {
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
  }, [filteredProducts])

  const resetForm = useCallback(() => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData(initialFormData)
    setTouched({})
    setErrors({})
  }, [])

  const openForm = useCallback(() => {
    setShowForm(true)
    setTouched({})
    setErrors({})
  }, [])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only jpg, png, and webp are allowed')
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB')
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Upload failed')
        return
      }

      setFormData((prev) => ({ ...prev, image: data.url }))
      toast.success('Image uploaded successfully')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleSort = useCallback((column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }))
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((p) => p.id))
    }
  }, [selectedProducts.length, products])

  const handleSelectProduct = useCallback((id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((pid) => pid !== id))
    } else {
      setSelectedProducts([...selectedProducts, id])
    }
  }, [selectedProducts])

  const paginatedProducts = filteredProducts.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  )

  return {
    products,
    filteredProducts,
    loading,
    formData,
    errors,
    touched,
    saving,
    uploading,
    showForm,
    editingProduct,
    filters,
    pagination,
    paginatedProducts,
    selectedProducts,
    showDeleteModal,
    productToDelete,
    fetchProducts,
    setFilters,
    setPagination,
    handleSort,
    handleSelectAll,
    handleSelectProduct,
    handleChange,
    handleBlur,
    handleSubmit,
    handleEdit,
    handleDelete,
    confirmDelete,
    handleBulkDelete,
    handleExportCSV,
    resetForm,
    openForm,
    handleImageUpload,
  }
}

export function getStockStatus(stock: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (stock === 0) return 'OUT_OF_STOCK'
  if (stock <= 5) return 'LOW_STOCK'
  return 'IN_STOCK'
}