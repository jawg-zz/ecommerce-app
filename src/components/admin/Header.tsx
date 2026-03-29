'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  Search,
  Moon,
  Sun,
  Plus,
  ChevronRight,
  Settings,
  User,
} from 'lucide-react'
import { MobileToggle } from './Sidebar'

interface HeaderProps {
  onMenuClick: () => void
}

const breadcrumbMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/orders': 'Orders',
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const currentPage = breadcrumbMap[pathname] || 'Admin'

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <MobileToggle onClick={onMenuClick} />
          
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="text-slate-500 hover:text-slate-700">
              Admin
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900">{currentPage}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No new notifications
                  </div>
                </div>
                <Link
                  href="/admin/notifications"
                  className="block px-4 py-2 text-center text-sm text-sky-600 hover:bg-slate-50 border-t border-slate-200"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {pathname === '/admin/products' && (
            <button
              onClick={() => {
                const event = new CustomEvent('openProductForm')
                window.dispatchEvent(event)
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
