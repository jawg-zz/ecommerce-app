'use client'

import { ReactNode, createContext, useContext, useState, useEffect } from 'react'

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

interface AppContextType {
  user: User | null
  cart: Cart
  setUser: (user: User | null) => void
  setCart: (cart: Cart) => void
  refreshCart: () => Promise<void>
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

    loadData()
    setMounted(true)
  }, [])

  return (
    <AppContext.Provider value={{ user, cart, setUser, setCart, refreshCart }}>
      {children}
    </AppContext.Provider>
  )
}
