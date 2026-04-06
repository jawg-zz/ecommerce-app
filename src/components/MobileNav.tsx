'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  cartItemCount?: number
}

export function MobileNav({ isOpen, onClose, cartItemCount = 0 }: MobileNavProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <Link href="/" onClick={onClose} className="text-xl font-bold text-slate-900">
              Store
            </Link>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Main navigation">
            <div className="space-y-1">
              <MobileNavLink href="/" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </MobileNavLink>

              <MobileNavLink href="/products" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Products
              </MobileNavLink>

              <MobileNavLink href="/cart" onClick={onClose}>
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky-500 text-white text-xs rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                Cart
              </MobileNavLink>

              <MobileNavLink href="/orders" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Orders
              </MobileNavLink>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Categories
              </p>
              <div className="space-y-1">
                <MobileNavLink href="/products?category=ELECTRONICS" onClick={onClose}>
                  Electronics
                </MobileNavLink>
                <MobileNavLink href="/products?category=CLOTHING" onClick={onClose}>
                  Clothing
                </MobileNavLink>
                <MobileNavLink href="/products?category=BOOKS" onClick={onClose}>
                  Books
                </MobileNavLink>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200">
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl text-center transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
        isActive
          ? 'bg-sky-50 text-sky-600'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </Link>
  )
}
