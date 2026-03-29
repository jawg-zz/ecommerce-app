import { cookies } from 'next/headers'
import { randomBytes, createHmac } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET!
const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'

/**
 * Generate a CSRF token
 */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const signature = createHmac('sha256', CSRF_SECRET).update(token).digest('hex')
  const csrfToken = `${token}.${signature}`
  
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  
  return csrfToken
}

/**
 * Verify a CSRF token
 */
export async function verifyCsrfToken(token: string | null): Promise<boolean> {
  if (!token) return false
  
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  
  if (!cookieToken) return false
  
  // Verify token matches cookie
  if (token !== cookieToken) return false
  
  // Verify signature
  const [tokenPart, signature] = token.split('.')
  if (!tokenPart || !signature) return false
  
  const expectedSignature = createHmac('sha256', CSRF_SECRET).update(tokenPart).digest('hex')
  
  return signature === expectedSignature
}

/**
 * Get CSRF token from request headers or body
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check X-CSRF-Token header
  const headerToken = request.headers.get('X-CSRF-Token')
  if (headerToken) return headerToken
  
  // For form submissions, token should be in body
  return null
}
