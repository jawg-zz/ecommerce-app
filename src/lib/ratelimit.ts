import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// Rate limiter for authentication endpoints
// 10 requests per 10 minutes per IP
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:auth',
})

// Rate limiter for checkout endpoint
// 5 requests per minute per user
export const checkoutRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:checkout',
})
