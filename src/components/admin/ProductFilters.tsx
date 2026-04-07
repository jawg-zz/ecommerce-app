'use client'

import { Search, Filter } from 'lucide-react'
import { Filters } from '@/hooks/useProducts'

interface ProductFiltersProps {
  filters: Filters
  onFiltersChange: React.Dispatch<React.SetStateAction<Filters>>
  showFilters: boolean
  onToggleFilters: () => void
}

export function ProductFilters({
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
}: ProductFiltersProps) {
  return (
    <div className="card p-4 mb-6 animate-slide-down">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value }))}
            className="input-field pl-9"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange((prev) => ({ ...prev, category: e.target.value }))}
          className="input-field"
        >
          <option value="">All Categories</option>
          <option value="ELECTRONICS">Electronics</option>
          <option value="CLOTHING">Clothing</option>
          <option value="BOOKS">Books</option>
        </select>
        <select
          value={filters.stockStatus}
          onChange={(e) => onFiltersChange((prev) => ({ ...prev, stockStatus: e.target.value }))}
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
            onFiltersChange((prev) => ({ ...prev, sortBy, sortOrder }))
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
  )
}