import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedis() {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
    lazyConnect: true,
  })
}

export const redis = globalForRedis.redis ?? createRedis()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
