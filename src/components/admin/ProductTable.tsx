'use client'

import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { ChevronUp, ChevronDown, Edit2, Trash2, Package, Image as ImageIcon } from 'lucide-react'
import { Product, Pagination, getStockStatus } from '@/hooks/useProducts'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface ProductTableProps {
  products: Product[]
  paginatedProducts: Product[]
  loading: boolean
  pagination: Pagination
  selectedProducts: string[]
  filtersSortBy: string
  filtersSortOrder: 'asc' | 'desc'
  onSort: (column: string) => void
  onSelectAll: () => void
  onSelectProduct: (id: string) => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onPaginationChange: React.Dispatch<React.SetStateAction<Pagination>>
}

const categoryColors: Record<string, string> = {
  ELECTRONICS: 'bg-blue-100 text-blue-700',
  CLOTHING: 'bg-emerald-100 text-emerald-700',
  BOOKS: 'bg-amber-100 text-amber-700',
}

export function ProductTable({
  products,
  paginatedProducts,
  loading,
  pagination,
  selectedProducts,
  filtersSortBy,
  filtersSortOrder,
  onSort,
  onSelectAll,
  onSelectProduct,
  onEdit,
  onDelete,
  onPaginationChange,
}: ProductTableProps) {
  const getSortIcon = (column: string) => {
    if (filtersSortBy !== column) return null
    return filtersSortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedProducts.length > 0 && selectedProducts.length === products.length}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-2">
                  Product {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center gap-2">
                  Category {getSortIcon('category')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center gap-2">
                  Price {getSortIcon('price')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => onSort('stock')}
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
                      onChange={() => onSelectProduct(product.id)}
                      className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                            loading="lazy"
                            quality={85}
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
                        onClick={() => onEdit(product)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-sky-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
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

      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => onPaginationChange((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
              className="px-2 py-1 border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>of {pagination.total} entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPaginationChange((prev) => ({ ...prev, page: 1 }))}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => onPaginationChange((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 rotate-270" />
            </button>
            <span className="px-3 text-sm text-slate-600">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              onClick={() => onPaginationChange((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 -rotate-270" />
            </button>
            <button
              onClick={() => onPaginationChange((prev) => ({ ...prev, page: totalPages }))}
              disabled={pagination.page >= totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}