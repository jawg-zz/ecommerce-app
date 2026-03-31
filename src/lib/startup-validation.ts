import { prisma } from './prisma'
import { redis } from './redis'
import { logInfo, logError } from './logger'

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'NODE_ENV',
]

export async function validateStartup(): Promise<void> {
  logInfo('Starting startup validation...')

  // 1. Check required environment variables
  const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName])
  if (missingVars.length > 0) {
    logError('Missing required environment variables', { missing: missingVars })
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
  logInfo('✓ All required environment variables are set')

  // 2. Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    logInfo('✓ Database connection successful')
  } catch (error) {
    logError('Database connection failed', { error: String(error) })
    throw new Error(`Database connection failed: ${error}`)
  }

  // 3. Test Redis connection
  try {
    await redis.connect()
    await redis.ping()
    logInfo('✓ Redis connection successful')
  } catch (error) {
    logError('Redis connection failed', { error: String(error) })
    throw new Error(`Redis connection failed: ${error}`)
  }

  logInfo('✓ Startup validation completed successfully')
}

export { startWorkers } from './workers'
