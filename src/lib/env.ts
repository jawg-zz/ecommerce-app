import { z } from 'zod'

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.string().default('6379'),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
}).refine(
  (data) => {
    if (data.MPESA_ENV === 'production') {
      return !!data.MPESA_CONSUMER_KEY
    }
    return true
  },
  {
    message: 'MPESA_CONSUMER_KEY is required when MPESA_ENV is production',
    path: ['MPESA_CONSUMER_KEY'],
  }
)

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Environment validation failed: ${errors}`)
  }
  
  return result.data
}

export const env = validateEnv()
