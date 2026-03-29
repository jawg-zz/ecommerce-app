import { prisma } from './prisma'
import { redis } from './redis'
import { logInfo, logError } from './logger'

let isShuttingDown = false

export function registerShutdownHandlers() {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return
    isShuttingDown = true

    logInfo(`Received ${signal}, starting graceful shutdown`)

    try {
      await prisma.$disconnect()
      logInfo('Database connections closed')
    } catch (error) {
      logError('Error closing database connections', { error: String(error) })
    }

    try {
      await redis.quit()
      logInfo('Redis connections closed')
    } catch (error) {
      logError('Error closing Redis connections', { error: String(error) })
    }

    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
