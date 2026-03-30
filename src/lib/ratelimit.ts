import { redis } from './redis'

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  pending: Promise<unknown>
}

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local random = ARGV[4]

local windowStart = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

local count = redis.call('ZCARD', key)

if count >= maxRequests then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetTime = 0
  if #oldest > 1 then
    resetTime = tonumber(oldest[2]) + window
  else
    resetTime = now + window
  end
  return {0, count, resetTime}
end

redis.call('ZADD', key, now, random)
redis.call('EXPIRE', key, math.ceil(window / 1000))

return {1, count + 1, now + window}
`

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
    const random = `${now}:${Math.random()}`

    try {
      const result = await redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        now,
        this.windowMs,
        this.maxRequests,
        random
      ) as [number, number, number]

      const [success, count, reset] = result

      if (success === 0) {
        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset,
          pending: Promise.resolve(),
        }
      }

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - count,
        reset,
        pending: Promise.resolve(),
      }
    } catch (error) {
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

// Rate limiter for product endpoints
// 60 requests per minute per IP
export const productRateLimiter = new SimpleRateLimiter(
  'ratelimit:products',
  60,
  60 * 1000 // 1 minute
)
