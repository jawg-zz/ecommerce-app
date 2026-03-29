'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  sort?: {
    sortBy: string
    sortOrder: 'asc' | 'desc'
    onSort: (key: string) => void
  }
  emptyMessage?: string
  selectable?: boolean
  selectedItems?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  pagination,
  sort,
  emptyMessage = 'No data available',
  selectable = false,
  selectedItems = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 10)

  const handleSort = (key: string) => {
    if (sort) {
      sort.onSort(key)
    }
  }

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectedItems.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map(keyExtractor))
    }
  }

  const handleSelectItem = (id: string) => {
    if (!onSelectionChange) return
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedItems, id])
    }
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  const renderSortIcon = (key: string) => {
    if (!sort || sort.sortBy !== key) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />
    }
    return sort.sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-sky-500" />
    ) : (
      <ArrowDown className="w-4 h-4 text-sky-500" />
    )
  }

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-100 border-b border-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-slate-100 flex items-center px-4 gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedItems.length === data.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-sm font-semibold text-slate-700 ${
                    column.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(keyExtractor(item))}
                        onChange={() => handleSelectItem(keyExtractor(item))}
                        className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-slate-600">
                      {column.render ? column.render(item) : (item as Record<string, unknown>)[column.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => {
                pagination.onPageSizeChange(Number(e.target.value))
                pagination.onPageChange(1)
              }}
              className="px-2 py-1 border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>of {pagination.total} entries</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
