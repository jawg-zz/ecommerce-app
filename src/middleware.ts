import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/csrf',
  '/api/mpesa/callback',
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
    
    const csrfToken = request.headers.get('X-CSRF-Token')
    const cookieToken = request.cookies.get('csrf-token')?.value
    
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
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
