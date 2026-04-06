'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from './Providers'

export function BottomNav() {
  const pathname = usePathname()
  const { cart, wishlist } = useApp()
  
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const wishlistCount = wishlist.length

  const navItems = [
    {
      href: '/',
      label: 'Home',
      active: pathname === '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/products',
      label: 'Products',
      active: pathname === '/products' || pathname.startsWith('/products/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/cart',
      label: 'Cart',
      active: pathname === '/cart',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-scale-in">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
      ),
    },
    {
      href: '/wishlist',
      label: 'Wishlist',
      active: pathname === '/wishlist',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {wishlistCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-scale-in">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
        </div>
      ),
    },
    {
      href: '/orders',
      label: 'Orders',
      active: pathname === '/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 lg:hidden safe-area-pb" aria-label="Main navigation">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${
              item.active 
                ? 'text-sky-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-current={item.active ? 'page' : undefined}
          >
            <div className={`transition-transform duration-200 ${item.active ? 'scale-110' : ''}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${item.active ? 'text-sky-600' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {item.active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-500 rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
