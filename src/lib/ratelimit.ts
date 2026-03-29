import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Upstash Redis client for rate limiting
const upstashRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || `http://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Rate limiter for authentication endpoints
// 10 requests per 10 minutes per IP
export const authRateLimiter = new Ratelimit({
  redis: upstashRedis,
  limiter: Ratelimit.slidingWindow(10, '10 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:auth',
})

// Rate limiter for checkout endpoint
// 5 requests per minute per user
export const checkoutRateLimiter = new Ratelimit({
  redis: upstashRedis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:checkout',
})
