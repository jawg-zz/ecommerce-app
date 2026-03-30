import { redis } from './redis'

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  pending: Promise<unknown>
}

class SimpleRateLimiter {
  private prefix: string
  private maxRequests: number
  private windowMs: number

  constructor(prefix: string, limit: number, windowMs: number) {
    this.prefix = prefix
    this.maxRequests = limit
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.windowMs

    try {
      // Remove old entries outside the window
      await redis.zremrangebyscore(key, 0, windowStart)

      // Count requests in current window
      const count = await redis.zcard(key)

      if (count >= this.maxRequests) {
        // Get the oldest entry to calculate reset time
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
        const resetTime = oldest.length > 1 ? parseInt(oldest[1]) + this.windowMs : now + this.windowMs

        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: resetTime,
          pending: Promise.resolve(),
        }
      }

      // Add current request with atomic ZADD + EXPIRE using pipeline
      const pipeline = redis.pipeline()
      pipeline.zadd(key, now, `${now}:${Math.random()}`)
      pipeline.expire(key, Math.ceil(this.windowMs / 1000))
      await pipeline.exec()

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - count - 1,
        reset: now + this.windowMs,
        pending: Promise.resolve(),
      }
    } catch (error) {
      // On Redis error, allow the request (fail open)
      console.error('[RateLimit] Redis error:', error)
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
        pending: Promise.resolve(),
      }
    }
  }
}

// Rate limiter for authentication endpoints
// 10 requests per 10 minutes per IP
export const authRateLimiter = new SimpleRateLimiter(
  'ratelimit:auth',
  10,
  10 * 60 * 1000 // 10 minutes
)

// Rate limiter for checkout endpoint
// 5 requests per minute per user
export const checkoutRateLimiter = new SimpleRateLimiter(
  'ratelimit:checkout',
  5,
  60 * 1000 // 1 minute
)
