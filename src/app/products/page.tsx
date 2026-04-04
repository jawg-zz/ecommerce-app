'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from '@/components/ProductCard'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
  averageRating?: number
  reviewCount?: number
}

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const minRating = searchParams.get('minRating') || ''
  const inStock = searchParams.get('inStock') || ''

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      if (minRating) params.set('minRating', minRating)
      if (inStock) params.set('inStock', inStock)

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setLoading(false)
    }

    fetchProducts()
  }, [page, category, search, sort, minPrice, maxPrice, minRating, inStock])

  useEffect(() => {
    if (searchInput.length >= 2) {
      const fetchSuggestions = async () => {
        const params = new URLSearchParams()
        params.set('search', searchInput)
        params.set('autocomplete', 'true')
        params.set('limit', '8')
        
        const res = await fetch(`/api/products?${params}`)
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
      
      const timer = setTimeout(fetchSuggestions, 200)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [searchInput])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }, [router, searchParams])

  const handleCategoryChange = (cat: string) => updateParams({ category: cat })
  const handleSortChange = (newSort: string) => updateParams({ sort: newSort })
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateParams({ search: searchInput || null })
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchInput(suggestion)
    setShowSuggestions(false)
    updateParams({ search: suggestion })
  }

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [key]: value || null })
  }

  const clearSearch = () => {
    setSearchInput('')
    updateParams({ search: null })
  }

  const clearFilters = () => {
    setSearchInput('')
    router.push('/products')
  }

  const activeFilters = [
    category && { key: 'category', value: category, label: category },
    minPrice && { key: 'minPrice', value: minPrice, label: `Min: KES ${minPrice}` },
    maxPrice && { key: 'maxPrice', value: maxPrice, label: `Max: KES ${maxPrice}` },
    minRating && { key: 'minRating', value: minRating, label: `${minRating}+ stars` },
    inStock && { key: 'inStock', value: inStock, label: 'In Stock' },
  ].filter(Boolean)

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Products</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 lg:hidden`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                name="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search products..."
                className="input-field pr-10 w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="input-field md:w-40"
            >
              <option value="">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="CLOTHING">Clothing</option>
              <option value="BOOKS">Books</option>
            </select>

            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="input-field md:w-44"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="popular">Most Popular</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="card p-4 mb-6 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filters</h3>
              {activeFilters.length > 0 && (
                <button onClick={clearFilters} className="text-sm text-sky-600 hover:text-sky-700">
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Min Price (KES)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Max Price (KES)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Any"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => handleFilterChange('minRating', e.target.value)}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock === 'true'}
                    onChange={(e) => handleFilterChange('inStock', e.target.checked ? 'true' : '')}
                    className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">In stock only</span>
                </label>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                {activeFilters.map((filter) => (
                  <span
                    key={filter?.key}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm"
                  >
                    {filter?.label}
                    <button
                      onClick={() => handleFilterChange(filter!.key, '')}
                      className="hover:text-sky-900"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && search && (
          <p className="text-slate-600 mb-4">
            {total === 1 ? '1 result' : `${total} results`} for '{search}'
            {activeFilters.length > 0 && ` (filtered)`}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                  <div className="h-10 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No products found.</p>
            {activeFilters.length > 0 && (
              <button onClick={clearFilters} className="mt-4 text-sky-600 hover:text-sky-700">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="py-8">
        <div className="container-custom">
          <h1 className="text-3xl font-bold mb-8">Products</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                  <div className="h-10 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}