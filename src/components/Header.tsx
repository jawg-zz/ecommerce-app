'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useApp } from './Providers'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, cart } = useApp()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-slate-900">
            E-Commerce
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/products" className="text-slate-600 hover:text-slate-900">
              Products
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              className="relative p-2 text-slate-600 hover:text-slate-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                  <span className="hidden sm:inline">{user.name}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-slate-600 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm">
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-slate-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden py-4 border-t border-slate-200">
            <Link
              href="/"
              className="block py-2 text-slate-600"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/products"
              className="block py-2 text-slate-600"
              onClick={() => setMenuOpen(false)}
            >
              Products
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
