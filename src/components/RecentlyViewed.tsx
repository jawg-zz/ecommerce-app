'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useApp } from './Providers'
import { formatPrice } from '@/lib/utils'

export function RecentlyViewed() {
  const { recentlyViewed } = useApp()

  if (recentlyViewed.length === 0) {
    return null
  }

  return (
    <section className="py-8 bg-slate-50">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Recently Viewed</h2>
          <Link 
            href="/wishlist" 
            className="text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            View All
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x snap-mandatory">
          {recentlyViewed.slice(0, 10).map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex-shrink-0 w-40 sm:w-48 snap-start"
            >
              <div className="card overflow-hidden group">
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="200px"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg
                        className="h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-sky-600 transition-colors">
                    {product.name}
                  </p>
                  <p className="text-sky-600 font-bold text-sm mt-1">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function RecentlyViewedHorizontal() {
  const { recentlyViewed } = useApp()

  if (recentlyViewed.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recently Viewed</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {recentlyViewed.slice(0, 6).map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex-shrink-0 w-28 sm:w-32"
          >
            <div className="card overflow-hidden group">
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="128px"
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-slate-900 line-clamp-1 group-hover:text-sky-600 transition-colors">
                  {product.name}
                </p>
                <p className="text-sky-600 font-bold text-xs mt-0.5">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
