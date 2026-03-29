'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'

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
  { icon: '🛡️', label: 'Secure Payment' },
  { icon: '🚚', label: 'Fast Delivery' },
  { icon: '↩️', label: 'Easy Returns' },
  { icon: '💬', label: '24/7 Support' },
]

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
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
      setCategories(categoriesData || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

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
        </div>
        
        <div className="relative container-custom py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-sky-300 mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Free shipping on orders over KES 5,000
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-slide-up">
              Discover Amazing
              <span className="block gradient-text">Products Online</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl animate-slide-up stagger-1">
              Shop the latest electronics, trendy clothing, and bestselling books. 
              Quality products at unbeatable prices delivered to your doorstep.
            </p>
            
            <div className="flex flex-wrap gap-4 animate-slide-up stagger-2">
              <Link 
                href="/products" 
                className="btn-primary text-base px-8 py-3.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Shop Now
              </Link>
              <Link 
                href="/products?category=ELECTRONICS" 
                className="btn-secondary text-base px-8 py-3.5 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Browse Electronics
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
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {trustBadges.map((badge, index) => (
              <div 
                key={badge.label} 
                className="flex items-center gap-2 text-slate-600 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-xl">{badge.icon}</span>
                <span className="text-sm font-medium hidden sm:inline">{badge.label}</span>
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
                    className="group relative overflow-hidden card-elevated p-8 text-center hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${catConfig.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors duration-300">
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
                  <ProductCard product={product} />
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
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center">
              <div className="absolute top-4 left-4 text-6xl text-slate-700 font-serif">"</div>
              <div className="relative">
                <div className="flex justify-center mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <p className="text-lg md:text-xl text-slate-200 mb-8 leading-relaxed">
                  {testimonials[currentTestimonial].text}
                </p>
                
                <div>
                  <p className="font-semibold text-white">
                    {testimonials[currentTestimonial].name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {testimonials[currentTestimonial].location}
                  </p>
                </div>
              </div>
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
          <div className="card-elevated p-8 md:p-12 bg-gradient-to-br from-sky-500 to-blue-600 text-white text-center rounded-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Start Shopping?
            </h2>
            <p className="text-sky-100 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of satisfied customers and discover amazing deals today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/products" 
                className="bg-white text-sky-600 hover:bg-sky-50 font-semibold py-3 px-8 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Browse Products
              </Link>
              <Link 
                href="/login" 
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-xl transition-all backdrop-blur-sm"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
