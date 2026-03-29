import { z, ZodSchema } from 'zod'

const envSchema: ZodSchema = z.object({
  JWT_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default('6379'),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
})

type EnvData = z.infer<typeof envSchema>

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

function validateEnv(): EnvData {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Environment validation failed: ${errors}`)
  }

  const data = result.data
  
  if (data.MPESA_ENV === 'production' && !data.MPESA_CONSUMER_KEY) {
    throw new Error('MPESA_CONSUMER_KEY is required when MPESA_ENV is production')
  }
  
  return data
}

const cache = new Map<string, unknown>()

function getCached<T>(key: string, factory: () => T): T {
  if (cache.has(key)) {
    return cache.get(key) as T
  }
  const value = factory()
  cache.set(key, value)
  return value
}

export const env = {
  get JWT_SECRET() {
    return getCached('JWT_SECRET', () => {
      if (isBuildTime) return undefined
      const val = validateEnv().JWT_SECRET
      return val
    })
  },
  get DATABASE_URL() {
    return getCached('DATABASE_URL', () => validateEnv().DATABASE_URL)
  },
  get REDIS_HOST() {
    return getCached('REDIS_HOST', () => validateEnv().REDIS_HOST)
  },
  get REDIS_PORT() {
    return getCached('REDIS_PORT', () => validateEnv().REDIS_PORT)
  },
  get MPESA_ENV() {
    return getCached('MPESA_ENV', () => validateEnv().MPESA_ENV)
  },
  get MPESA_CONSUMER_KEY() {
    return getCached('MPESA_CONSUMER_KEY', () => validateEnv().MPESA_CONSUMER_KEY)
  },
  get MPESA_CONSUMER_SECRET() {
    return getCached('MPESA_CONSUMER_SECRET', () => validateEnv().MPESA_CONSUMER_SECRET)
  },
  get MPESA_SHORTCODE() {
    return getCached('MPESA_SHORTCODE', () => validateEnv().MPESA_SHORTCODE)
  },
  get MPESA_PASSKEY() {
    return getCached('MPESA_PASSKEY', () => validateEnv().MPESA_PASSKEY)
  },
  get MPESA_CALLBACK_URL() {
    return getCached('MPESA_CALLBACK_URL', () => validateEnv().MPESA_CALLBACK_URL)
  },
  get NODE_ENV() {
    return getCached('NODE_ENV', () => validateEnv().NODE_ENV)
  },
  get LOG_LEVEL() {
    return getCached('LOG_LEVEL', () => validateEnv().LOG_LEVEL)
  },
}

type EnvKey = 'JWT_SECRET' | 'DATABASE_URL' | 'REDIS_HOST' | 'REDIS_PORT' | 'MPESA_ENV' | 'MPESA_CONSUMER_KEY' | 'MPESA_CONSUMER_SECRET' | 'MPESA_SHORTCODE' | 'MPESA_PASSKEY' | 'MPESA_CALLBACK_URL' | 'NODE_ENV' | 'LOG_LEVEL'

export function requireEnv(name: EnvKey): string {
  if (isBuildTime) {
    if (name === 'JWT_SECRET') {
      return 'build-time-dummy-secret-key-12345678901234567890'
    }
    return 'build-time-dummy'
  }
  const value = (env as Record<string, unknown>)[name]
  if (!value) {
    throw new Error(`${name} environment variable is required`)
  }
  return value as string
}
