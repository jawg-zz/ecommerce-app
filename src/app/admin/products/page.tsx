'use client'

import { useState } from 'react'
import { Filter, Download, Plus, Trash2 } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { ConfirmModal } from '@/components/admin/Modal'
import { ProductFilters } from '@/components/admin/ProductFilters'
import { ProductForm } from '@/components/admin/ProductForm'
import { ProductTable } from '@/components/admin/ProductTable'

export default function AdminProductsPage() {
  const [showFilters, setShowFilters] = useState(false)

  const {
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
  } = useProducts()

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
            onClick={openForm}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <ProductFilters
        filters={filters}
        onFiltersChange={setFilters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

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
                onClick={() => handleSelectAll()}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductForm
        showForm={showForm}
        editingProduct={editingProduct}
        formData={formData}
        errors={errors}
        touched={touched}
        saving={saving}
        uploading={uploading}
        onChange={handleChange}
        onBlur={handleBlur}
        onSubmit={handleSubmit}
        onReset={resetForm}
        onImageUpload={handleImageUpload}
      />

      <ProductTable
        products={products}
        paginatedProducts={paginatedProducts}
        loading={loading}
        pagination={pagination}
        selectedProducts={selectedProducts}
        filtersSortBy={filters.sortBy}
        filtersSortOrder={filters.sortOrder}
        onSort={handleSort}
        onSelectAll={handleSelectAll}
        onSelectProduct={handleSelectProduct}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPaginationChange={setPagination}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {}}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  )
}