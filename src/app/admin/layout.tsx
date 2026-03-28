'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useApp()

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, router])

  if (!user || user.role !== 'ADMIN') {
    return null
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/orders', label: 'Orders' },
  ]

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>

        <div className="flex gap-4 mb-8 border-b border-slate-200">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-3 px-1 font-medium ${
                  isActive
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {children}
      </div>
    </div>
  )
}
