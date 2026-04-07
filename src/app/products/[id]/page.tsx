'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from '@/components/Providers'
import { ProductCard } from '@/components/ProductCard'
import { RecentlyViewedHorizontal } from '@/components/RecentlyViewed'
import { formatPrice } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import toast from 'react-hot-toast'

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
  specifications?: Record<string, string> | null
}

interface Review {
  id: string
  rating: number
  title: string | null
  content: string | null
  helpful: number
  verified: boolean
  createdAt: string
  user: { id: string; name: string }
}

function Breadcrumbs({ product }: { product: Product }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-8" aria-label="Breadcrumb">
      <Link 
        href="/" 
        className="text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Home
      </Link>
      <span className="text-slate-300">/</span>
      <Link 
        href="/products" 
        className="text-slate-500 hover:text-sky-600 transition-colors"
      >
        Products
      </Link>
      <span className="text-slate-300">/</span>
      <Link 
        href={`/products?category=${product.category}`}
        className="text-slate-500 hover:text-sky-600 transition-colors"
      >
        {product.category.charAt(0) + product.category.slice(1).toLowerCase()}
      </Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-900 font-medium truncate max-w-[200px]">{product.name}</span>
    </nav>
  )
}

function ProductImage({ product }: { product: Product }) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [showLightbox, setShowLightbox] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPosition({ x, y })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLightbox) {
        setShowLightbox(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showLightbox])

  return (
    <>
      <div 
        className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative cursor-zoom-in"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setShowLightbox(true)}
        role="button"
        tabIndex={0}
        aria-label="Click to view full size"
      >
        {product.image ? (
          <div className="w-full h-full overflow-hidden relative">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              quality={85}
              className={`object-cover transition-transform duration-300 ${
                isZoomed ? 'scale-150' : 'scale-100'
              }`}
              style={isZoomed ? { transformOrigin: `${position.x}% ${position.y}%` } : undefined}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-32 w-32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-red-500 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-lg">
              Out of Stock
            </span>
          </div>
        )}

        {isZoomed && (
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-lg">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Hover to zoom, click for full view
            </span>
          </div>
        )}
      </div>

      {showLightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setShowLightbox(false)}
            aria-label="Close lightbox"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              width={800}
              height={800}
              className="max-w-full max-h-full object-contain"
              priority
            />
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            Press ESC to close
          </div>
        </div>
      )}
    </>
  )
}

function StarRating({ 
  rating, 
  reviewCount, 
  interactive = false,
  onRatingChange 
}: { 
  rating?: number; 
  reviewCount?: number
  interactive?: boolean
  onRatingChange?: (rating: number) => void
}) {
  const [hoverRating, setHoverRating] = useState(0)
  const currentRating = hoverRating || rating || 0
  const count = reviewCount || 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`focus:outline-none ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onClick={() => interactive && onRatingChange?.(star)}
            disabled={!interactive}
          >
            <svg 
              className={`w-5 h-5 transition-colors ${
                star <= currentRating 
                  ? 'text-yellow-400' 
                  : 'text-slate-200'
              }`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-sm text-slate-500">
          {currentRating.toFixed(1)} ({count} reviews)
        </span>
      )}
    </div>
  )
}

function ProductSpecifications({ specifications }: { specifications: Record<string, string> }) {
  const entries = Object.entries(specifications)
  
  if (entries.length === 0) return null

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Specifications</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <tbody>
            {entries.map(([key, value], index) => (
              <tr key={key} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="px-6 py-4 text-sm font-medium text-slate-600 w-1/3 border-r border-slate-100">
                  {key}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SocialShare({ product }: { product: Product }) {
  const [copied, setCopied] = useState(false)
  const productUrl = typeof window !== 'undefined' ? window.location.href : ''
  const productName = encodeURIComponent(product.name)

  const shareOptions = [
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      name: 'Twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${productName}&url=${encodeURIComponent(productUrl)}`,
      color: 'bg-black hover:bg-gray-800 text-white',
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.06 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      url: `https://wa.me/?text=${productName}%20${encodeURIComponent(productUrl)}`,
      color: 'bg-green-500 hover:bg-green-600 text-white',
    },
  ]

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy link')
    }
  }

  return (
    <div className="flex items-center gap-3 mt-6">
      <span className="text-sm font-medium text-slate-600">Share:</span>
      <div className="flex gap-2">
        {shareOptions.map((option) => (
          <a
            key={option.name}
            href={option.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-lg transition-colors ${option.color}`}
            aria-label={`Share on ${option.name}`}
          >
            {option.icon}
          </a>
        ))}
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          aria-label="Copy link"
        >
          {copied ? (
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useApp()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<{ averageRating: number; totalReviews: number; distribution: Record<number, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, title: '', content: '' })

  useEffect(() => {
    fetchReviews()
  }, [productId, sort])

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}&sort=${sort}`)
      const data = await res.json()
      setReviews(data.reviews || [])
      setStats(data.stats)
    } catch {
      console.error('Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please login to submit a review')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: newReview.rating,
          title: newReview.title || null,
          content: newReview.content || null,
        }),
      })

      if (res.ok) {
        toast.success('Review submitted successfully!')
        setShowForm(false)
        setNewReview({ rating: 5, title: '', content: '' })
        fetchReviews()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit review')
      }
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
      fetchReviews()
    } catch {
      console.error('Failed to mark review as helpful')
    }
  }

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Customer Reviews</h2>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Write Your Review</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
              <StarRating 
                rating={newReview.rating} 
                interactive={true}
                onRatingChange={(r) => setNewReview({ ...newReview, rating: r })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title (optional)</label>
              <input
                type="text"
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                className="input-field"
                placeholder="Summarize your review"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Review (optional)</label>
              <textarea
                value={newReview.content}
                onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="Share your experience with this product"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="text-center md:text-left">
              <p className="text-4xl font-bold text-slate-900">{stats.averageRating.toFixed(1)}</p>
              <div className="flex justify-center md:justify-start mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-slate-200'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-1">{stats.totalReviews} reviews</p>
            </div>

            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 w-8">{star} star</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-slate-600">Sort by:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-field w-auto"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    {review.verified && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="font-semibold text-slate-900">{review.title}</h4>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">{review.user.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {review.content && (
                <p className="text-slate-600 mb-4">{review.content}</p>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleMarkHelpful(review.id)}
                  className="text-sm text-slate-500 hover:text-sky-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Helpful ({review.helpful})
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No reviews yet</h3>
          <p className="text-slate-500">Be the first to review this product!</p>
        </div>
      )}
    </div>
  )
}

function QuantitySelector({
  quantity,
  stock,
  onChange,
}: {
  quantity: number
  stock: number
  onChange: (qty: number) => void
}) {
  return (
    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
        aria-label="Decrease quantity"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
      <div className="w-16 h-12 flex items-center justify-center border-x border-slate-200 bg-slate-50">
        <span className="font-semibold text-slate-900 text-lg">{quantity}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(stock, quantity + 1))}
        disabled={quantity >= stock}
        className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
        aria-label="Increase quantity"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { setCart, addToWishlist, removeFromWishlist, isInWishlist, addToRecentlyViewed, user } = useApp()
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [alsoBought, setAlsoBought] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [wishlistAnimating, setWishlistAnimating] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const mainCtaRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!mainCtaRef.current) return
      
      const ctaRect = mainCtaRef.current.getBoundingClientRect()
      const isPastCta = ctaRect.bottom < 0
      
      setShowStickyBar(isPastCta)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const inWishlist = product ? isInWishlist(product.id) : false

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch(`/api/products/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
        
        addToRecentlyViewed({
          id: data.id,
          name: data.name,
          price: data.price,
          image: data.image,
          category: data.category,
        })
        
        const relatedRes = await fetch(`/api/products?category=${data.category}&limit=4`)
        const relatedData = await relatedRes.json()
        setRelatedProducts((relatedData.products || []).filter((p: Product) => p.id !== data.id).slice(0, 4))

        const recommendationsRes = await fetch(`/api/products/${params.id}/recommendations?limit=4`)
        if (recommendationsRes.ok) {
          const recommendations = await recommendationsRes.json()
          setAlsoBought(recommendations.alsoBought || [])
        }
      } else {
        router.push('/products')
      }
      setLoading(false)
    }

    fetchProduct()
  }, [params.id, router, addToRecentlyViewed])

  const handleAddToCart = async () => {
    if (!product) return
    
    if (product.stock === 0) {
      toast.error('This item is currently out of stock')
      return
    }

    setAdding(true)

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity }),
      })

      if (res.ok) {
        const data = await res.json()
        setCart(data)
        setAdded(true)
        toast.success(`${product.name} added to cart!`)
        
        setTimeout(() => {
          setAdded(false)
        }, 2000)
      } else {
        const data = await res.json()
        if (data.error?.includes('stock') || data.error?.includes('available')) {
          toast.error(`Not enough stock available. Only ${data.available} items in stock.`)
        } else {
          toast.error(data.error || 'Failed to add to cart')
        }
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast.error('Failed to add to cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleWishlistToggle = () => {
    if (!product) return
    
    if (inWishlist) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
      })
      setWishlistAnimating(true)
      setTimeout(() => setWishlistAnimating(false), 600)
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-48 mb-8" />
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="aspect-square bg-slate-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded w-3/4" />
                <div className="h-6 bg-slate-200 rounded w-1/4" />
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const categoryColors: Record<string, string> = {
    ELECTRONICS: 'bg-blue-100 text-blue-700',
    CLOTHING: 'bg-emerald-100 text-emerald-700',
    BOOKS: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <Breadcrumbs product={product} />

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="animate-fade-in">
            <ProductImage product={product} />
          </div>

          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  categoryColors[product.category]
                }`}
              >
                {product.category.charAt(0) + product.category.slice(1).toLowerCase()}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                  Only {product.stock} left
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {product.name}
            </h1>

            {(product.averageRating !== undefined && product.averageRating > 0) && (
              <div className="mb-6">
                <StarRating rating={product.averageRating} reviewCount={product.reviewCount} />
              </div>
            )}

            <p className="text-3xl lg:text-4xl font-bold text-sky-600 mb-6">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="mb-8">
                <h2 className="font-semibold text-slate-900 mb-2">Description</h2>
                <div 
                  className="text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                />
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <QuantitySelector
                    quantity={quantity}
                    stock={product.stock}
                    onChange={setQuantity}
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-1">Availability</p>
                  {product.stock > 0 ? (
                    <p className="text-green-600 font-medium flex items-center gap-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {product.stock} in stock
                    </p>
                  ) : (
                    <p className="text-red-500 font-medium">Out of stock</p>
                  )}
                </div>
              </div>

              <button
                ref={mainCtaRef}
                onClick={handleAddToCart}
                disabled={product.stock === 0 || adding || added}
                className={`w-full py-4 text-lg font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'btn-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
              >
                {adding ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding to Cart...
                  </>
                ) : added ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart!
                  </>
                ) : product.stock === 0 ? (
                  'Out of Stock'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleWishlistToggle}
                className={`w-full mt-3 py-3 border-2 font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                  inWishlist
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                } ${wishlistAnimating ? 'animate-scale' : ''}`}
              >
                <svg 
                  className="w-5 h-5" 
                  fill={inWishlist ? 'currentColor' : 'none'} 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Free shipping on orders over KES 5,000
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                30-day return policy
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                1-year warranty included
              </div>
            </div>

            <SocialShare product={product} />
          </div>
        </div>

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <ProductSpecifications specifications={product.specifications} />
        )}

        <ReviewsSection productId={product.id} />

        {alsoBought.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Customers Also Bought</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {alsoBought.map((product) => (
                <ProductCard key={product.id} product={product} priority={alsoBought.indexOf(product) < 2} />
              ))}
            </div>
          </div>
        )}

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} priority={relatedProducts.indexOf(relatedProduct) < 2} />
              ))}
            </div>
          </div>
        )}

        <RecentlyViewedHorizontal />

        {showStickyBar && product.stock > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            <div className="bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                <p className="text-lg font-bold text-sky-600">{formatPrice(product.price)}</p>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={adding || added}
                className={`shrink-0 px-6 py-3 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {adding ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : added ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                {added ? 'Added!' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}