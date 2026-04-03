import Redis from 'ioredis'
import { env } from './env'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
  redisPublisher: Redis | undefined
}

function createRedis() {
  const redisInstance = new Redis({
    host: env.REDIS_HOST || 'localhost',
    port: parseInt(env.REDIS_PORT || '6379'),
    password: env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
  })

  redisInstance.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
  })

  redisInstance.on('connect', () => {
    console.log('[Redis] Connected')
  })

  redisInstance.on('ready', () => {
    console.log('[Redis] Ready')
  })

  return redisInstance
}

function createRedisPublisher() {
  const redisInstance = new Redis({
    host: env.REDIS_HOST || 'localhost',
    port: parseInt(env.REDIS_PORT || '6379'),
    password: env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
    enableReadyCheck: true,
    lazyConnect: false,
  })

  redisInstance.on('error', (err) => {
    console.error('[Redis Publisher] Connection error:', err)
  })

  redisInstance.on('connect', () => {
    console.log('[Redis Publisher] Connected')
  })

  redisInstance.on('ready', () => {
    console.log('[Redis Publisher] Ready')
  })

  return redisInstance
}

export const redis = globalForRedis.redis ?? createRedis()
export const redisPublisher = globalForRedis.redisPublisher ?? createRedisPublisher()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
  globalForRedis.redisPublisher = redisPublisher
}

export async function connectRedis() {
  if (redis.status === 'wait') {
    await redis.connect()
  }
}
