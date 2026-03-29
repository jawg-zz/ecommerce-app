import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, getCsrfTokenFromRequest } from '@/lib/csrf'

export const runtime = 'nodejs'

const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/csrf', // Allow fetching CSRF tokens
  '/api/mpesa/callback', // M-Pesa callbacks don't have CSRF tokens
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  
  // Only check CSRF for state-changing operations on API routes
  if (pathname.startsWith('/api') && PROTECTED_METHODS.includes(method)) {
    // Skip CSRF check for exempt paths
    if (CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
      return NextResponse.next()
    }
    
    const csrfToken = getCsrfTokenFromRequest(request)
    const isValid = await verifyCsrfToken(csrfToken)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
