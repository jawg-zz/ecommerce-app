'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | { toNumber(): number }
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=8').then(r => r.json()),
      fetch('/api/categories').then(r => r.json())
    ]).then(([productsData, categoriesData]) => {
      setProducts(productsData.products || [])
      setCategories(categoriesData || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20">
        <div className="container-custom">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome to E-Commerce
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Discover amazing products at great prices. Shop electronics, clothing, and books all in one place.
            </p>
            <Link href="/products" className="btn-primary inline-block">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-custom">
          <h2 className="text-2xl font-bold mb-8">Categories</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={`/products?category=${category.name}`}
                  className="card p-6 text-center hover:border-blue-500 border-2 border-transparent"
                >
                  <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                  <p className="text-slate-500">
                    {category.count} products
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link href="/products" className="text-blue-500 hover:text-blue-600">
              View All &rarr;
            </Link>
          </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">
                No products available yet.
              </p>
              <Link href="/products" className="btn-primary mt-4 inline-block">
                Browse Products
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
