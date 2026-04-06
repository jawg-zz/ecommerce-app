import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BottomNav } from '@/components/BottomNav'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'E-Commerce Store',
  description: 'Your one-stop shop for electronics, clothing, and books',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-600 focus:text-white focus:rounded-lg focus:font-medium focus:shadow-lg"
          >
            Skip to main content
          </a>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main id="main-content" className="flex-1 pb-20 lg:pb-0">{children}</main>
            <Footer />
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}
