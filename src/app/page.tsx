'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { useApp } from '@/components/Providers'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
}

const categoryImages: Record<string, { bg: string; icon: string }> = {
  ELECTRONICS: {
    bg: 'from-blue-500 to-blue-600',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  CLOTHING: {
    bg: 'from-emerald-500 to-emerald-600',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  },
  BOOKS: {
    bg: 'from-amber-500 to-orange-500',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
}

const testimonials = [
  {
    name: 'Sarah M.',
    location: 'Nairobi',
    text: 'Fast delivery and excellent product quality. Will definitely shop here again!',
    rating: 5,
  },
  {
    name: 'James K.',
    location: 'Mombasa',
    text: 'Great customer service and amazing deals. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Emily W.',
    location: 'Kisumu',
    text: 'Love the variety of products available. Found exactly what I needed.',
    rating: 5,
  },
]

const trustBadges = [
  { 
    label: 'Secure Payment',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  { 
    label: 'Fast Delivery',
    icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  },
  { 
    label: 'Easy Returns',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  { 
    label: '24/7 Support',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
]

export default function HomePage() {
  const { recentlyViewed } = useApp()
  const [products, setProducts] = useState<Product[]>([])
  const [recommended, setRecommended] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=8').then(r => r.json()),
      fetch('/api/categories').then(r => r.json())
    ]).then(([productsData, categoriesData]) => {
      setProducts(productsData.products || [])
      setCategories(categoriesData.categories || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (recentlyViewed.length === 0) return

    const categories = [...new Set(recentlyViewed.map(p => p.category))].filter(Boolean)
    const viewedIds = recentlyViewed.map(p => p.id)

    const params = new URLSearchParams()
    if (categories.length > 0) params.set('categories', categories.join(','))
    if (viewedIds.length > 0) params.set('viewedIds', viewedIds.join(','))

    fetch(`/api/recommendations/homepage?${params.toString()}`)
      .then(r => r.json())
      .then(data => setRecommended(data.products || []))
      .catch(() => {})
  }, [recentlyViewed])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen">
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="absolute top-32 right-20 hidden lg:block">
          <div className="w-20 h-20 border-2 border-white/10 rounded-2xl rotate-12 animate-float" />
        </div>
        <div className="absolute bottom-40 left-20 hidden lg:block">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-transparent rounded-full animate-float" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-1/3 right-1/4 hidden lg:block">
          <div className="w-8 h-8 bg-yellow-400/20 rounded-lg rotate-45 animate-float" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <div className="relative container-custom py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-sky-300 mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Free shipping on orders over KES 5,000
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              Discover
              <span className="block gradient-text">Amazing Products</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl animate-slide-up stagger-1">
              Shop the latest electronics, trendy clothing, and bestselling books. 
              Quality products at unbeatable prices delivered to your doorstep.
            </p>
            
            <div className="flex flex-wrap gap-4 animate-slide-up stagger-2">
              <Link 
                href="/products" 
                className="group relative btn-primary text-base px-8 py-3.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden"
              >
                <span className="relative z-10">Shop Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link 
                href="/products?category=ELECTRONICS" 
                className="group btn-secondary text-base px-8 py-3.5 bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5"
              >
                Browse Electronics
                <svg className="inline-block w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-12 animate-fade-in stagger-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 border-2 border-slate-800 flex items-center justify-center text-sm font-medium"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-400">Trusted by 10,000+ customers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

            <section className="py-6 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-6 md:gap-16">
            {trustBadges.map((badge, index) => (
              <div 
                key={badge.label} 
                className="flex items-center justify-center gap-3 text-slate-600 animate-fade-in group cursor-default"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:shadow-md group-hover:scale-105 group-hover:-translate-y-0.5 transition-all duration-300">
                  <svg 
                    className="w-5 h-5 text-sky-500 group-hover:text-sky-600 transition-colors duration-300" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={badge.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Shop by Category
              </h2>
              <p className="text-slate-500">
                Find exactly what you&apos;re looking for
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-8 animate-pulse">
                  <div className="h-16 w-16 bg-slate-200 rounded-2xl mx-auto mb-4" />
                  <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((category, index) => {
                const catKey = category.name as keyof typeof categoryImages
                const catConfig = categoryImages[catKey] || categoryImages.ELECTRONICS
                return (
                  <Link
                    key={category.name}
                    href={`/products?category=${category.name}`}
                    className="group relative overflow-hidden card-elevated p-8 text-center hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${catConfig.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        <svg
                          className="w-8 h-8 text-slate-600 group-hover:text-white transition-colors duration-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={catConfig.icon} />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-white mb-1 transition-colors duration-300">
                        {category.name.charAt(0) + category.name.slice(1).toLowerCase()}
                      </h3>
                      <p className="text-sm text-slate-500 group-hover:text-white/80 transition-colors duration-300">
                        {category.count} products
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Featured Products
              </h2>
              <p className="text-slate-500">
                Handpicked selections just for you
              </p>
            </div>
            <Link 
              href="/products" 
              className="hidden md:flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              View All Products
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
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
              {products.map((product, index) => (
                <div 
                  key={product.id} 
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} priority={index < 4} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-slate-500 text-lg mb-4">
                No products available yet.
              </p>
              <Link href="/products" className="btn-primary">
                Browse Products
              </Link>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link href="/products" className="btn-secondary">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container-custom">
            <div className="flex items-end justify-between mb-8 md:mb-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Recommended For You
                </h2>
                <p className="text-slate-500">
                  Based on your browsing history
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.slice(0, 4).map((product, index) => (
                <div 
                  key={product.id} 
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} priority={index < 2} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed />

            <section className="py-16 md:py-20 bg-slate-900 text-white overflow-hidden">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              What Our Customers Say
            </h2>
            <p className="text-slate-400">
              Don&apos;t just take our word for it
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute top-4 left-4 md:left-8 text-5xl md:text-6xl text-slate-700 font-serif opacity-50">"</div>
                <div className="relative" key={currentTestimonial}>
                  <div className="flex justify-center mb-6">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-lg md:text-xl text-slate-200 mb-8 leading-relaxed animate-fade-in">
                    {testimonials[currentTestimonial].text}
                  </p>
                  
                  <div className="animate-slide-up">
                    <p className="font-semibold text-white">
                      {testimonials[currentTestimonial].name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {testimonials[currentTestimonial].location}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:translate-x-0 w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="Previous testimonial"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-0 w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="Next testimonial"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-sky-500 w-8' 
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

            <section className="py-16 md:py-20">
        <div className="container-custom">
          <div className="relative card-elevated p-8 md:p-12 bg-gradient-to-br from-sky-500 to-blue-600 text-white text-center rounded-3xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl" />
            </div>
            <div className="absolute top-4 right-8 hidden md:block">
              <svg className="w-12 h-12 text-white/20 animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="absolute bottom-4 left-8 hidden md:block">
              <svg className="w-10 h-10 text-white/20 animate-float" style={{ animationDelay: '1s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Start Shopping?
              </h2>
              <p className="text-sky-100 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of satisfied customers and discover amazing deals today.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  href="/products" 
                  className="group bg-white text-sky-600 hover:bg-sky-50 font-semibold py-3 px-8 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-sky-500"
                >
                  <span className="flex items-center gap-2">
                    Browse Products
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
                <Link 
                  href="/login" 
                  className="group bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 backdrop-blur-sm hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-sky-500"
                >
                  <span className="flex items-center gap-2">
                    Create Account
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
