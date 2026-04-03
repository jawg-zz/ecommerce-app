import Redis from 'ioredis'
import { env } from './env'
import { logError, logInfo } from './logger'

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
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  })

  redisInstance.on('error', (err) => {
    logError('Redis connection error', { error: String(err) })
  })

  redisInstance.on('connect', () => {
    logInfo('Redis connected')
  })

  redisInstance.on('ready', () => {
    logInfo('Redis ready')
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
    logError('Redis Publisher connection error', { error: String(err) })
  })

  redisInstance.on('connect', () => {
    logInfo('Redis Publisher connected')
  })

  redisInstance.on('ready', () => {
    logInfo('Redis Publisher ready')
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
