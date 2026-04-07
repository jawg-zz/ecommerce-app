'use client'

import Image from 'next/image'
import { X, Upload, Loader2 } from 'lucide-react'
import { Product, FormData, FormErrors } from '@/hooks/useProducts'

interface ProductFormProps {
  showForm: boolean
  editingProduct: Product | null
  formData: FormData
  errors: FormErrors
  touched: Record<string, boolean>
  saving: boolean
  uploading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onReset: () => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ProductForm({
  showForm,
  editingProduct,
  formData,
  errors,
  touched,
  saving,
  uploading,
  onChange,
  onBlur,
  onSubmit,
  onReset,
  onImageUpload,
}: ProductFormProps) {
  if (!showForm) return null

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </h3>
        <button onClick={onReset} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              onBlur={onBlur}
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
              onChange={onChange}
              onBlur={onBlur}
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
            onChange={onChange}
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
              onChange={onChange}
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
              onChange={onChange}
              onBlur={onBlur}
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
            <div className="flex gap-2">
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={onChange}
                onBlur={onBlur}
                className={`input-field flex-1 ${touched.image && errors.image ? 'border-red-500' : ''}`}
                placeholder="https://..."
              />
              <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {touched.image && errors.image && (
              <p className="text-red-500 text-xs mt-1">{errors.image}</p>
            )}
          </div>
        </div>

        {formData.image && (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden relative">
              <Image
                src={formData.image}
                alt="Preview"
                fill
                sizes="96px"
                className="object-cover"
                loading="lazy"
                quality={85}
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
          <button type="button" onClick={onReset} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}