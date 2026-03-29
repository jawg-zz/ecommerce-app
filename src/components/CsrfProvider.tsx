'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CsrfContextType {
  token: string | null
  refreshToken: () => Promise<void>
}

const CsrfContext = createContext<CsrfContextType>({
  token: null,
  refreshToken: async () => {},
})

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshToken = async () => {
    try {
      const res = await fetch('/api/csrf')
      const data = await res.json()
      setToken(data.token)
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshToken()
  }, [])

  // Don't render children until token is loaded to avoid hydration mismatch
  if (isLoading) {
    return <>{children}</>
  }

  return (
    <CsrfContext.Provider value={{ token, refreshToken }}>
      {children}
    </CsrfContext.Provider>
  )
}

export function useCsrf() {
  return useContext(CsrfContext)
}

export function getCsrfHeaders(token: string | null): HeadersInit {
  if (!token) return {}
  return { 'X-CSRF-Token': token }
}
