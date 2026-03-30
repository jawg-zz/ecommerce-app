'use client'

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
}

interface CartItem {
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    image: string | null
    stock: number
  }
}

interface Cart {
  items: CartItem[]
  total: number
}

interface WishlistItem {
  id: string
  name: string
  price: number
  image: string | null
  category: string
}

interface RecentlyViewedItem {
  id: string
  name: string
  price: number
  image: string | null
  category: string
  viewedAt: number
}

interface AppContextType {
  user: User | null
  cart: Cart
  wishlist: WishlistItem[]
  recentlyViewed: RecentlyViewedItem[]
  setUser: (user: User | null) => void
  setCart: (cart: Cart) => void
  refreshCart: () => Promise<void>
  addToWishlist: (product: WishlistItem) => void
  removeFromWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  addToRecentlyViewed: (product: Omit<RecentlyViewedItem, 'viewedAt'>) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within Providers')
  }
  return context
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 })
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([])
  const [mounted, setMounted] = useState(false)

  const refreshCart = async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setCart(data)
      }
    } catch {
      // Ignore cart errors
    }
  }

  const addToWishlist = useCallback((product: WishlistItem) => {
    setWishlist(prev => {
      if (prev.some(item => item.id === product.id)) {
        toast.success('Already in wishlist')
        return prev
      }
      const newWishlist = [product, ...prev].slice(0, 20)
      localStorage.setItem('wishlist', JSON.stringify(newWishlist))
      toast.success(`${product.name} added to wishlist!`)
      return newWishlist
    })
  }, [])

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist(prev => {
      const product = prev.find(item => item.id === productId)
      const newWishlist = prev.filter(item => item.id !== productId)
      localStorage.setItem('wishlist', JSON.stringify(newWishlist))
      if (product) {
        toast.success(`${product.name} removed from wishlist`)
      }
      return newWishlist
    })
  }, [])

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some(item => item.id === productId)
  }, [wishlist])

  const addToRecentlyViewed = useCallback((product: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item => item.id !== product.id)
      const newItem: RecentlyViewedItem = { ...product, viewedAt: Date.now() }
      const newRecentlyViewed = [newItem, ...filtered].slice(0, 10)
      localStorage.setItem('recentlyViewed', JSON.stringify(newRecentlyViewed))
      return newRecentlyViewed
    })
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, cartRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/cart'),
        ])

        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData)
        }

        if (cartRes.ok) {
          const cartData = await cartRes.json()
          setCart(cartData)
        }
      } catch {
        // Ignore errors
      }
    }

    const savedWishlist = localStorage.getItem('wishlist')
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch {
        // Ignore parse errors
      }
    }

    const savedRecentlyViewed = localStorage.getItem('recentlyViewed')
    if (savedRecentlyViewed) {
      try {
        setRecentlyViewed(JSON.parse(savedRecentlyViewed))
      } catch {
        // Ignore parse errors
      }
    }

    loadData()
    setMounted(true)
  }, [])

  return (
    <AppContext.Provider value={{ 
      user, 
      cart, 
      wishlist, 
      recentlyViewed,
      setUser, 
      setCart, 
      refreshCart,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      addToRecentlyViewed,
    }}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#334155',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {children}
    </AppContext.Provider>
  )
}
