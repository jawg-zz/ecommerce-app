import { cleanupStaleOrders } from './lib/cron/cleanup-stale-orders'
import { redis } from './lib/redis'
import { logger, logInfo, logError } from './lib/logger'
import { registerShutdownHandlers } from './lib/shutdown'

registerShutdownHandlers()

const INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

async function runCronJobs() {
  logInfo(`Cron service started. Running cleanup every ${INTERVAL_MS / 1000 / 60} minutes`)

  await runCleanupJob()

  setInterval(async () => {
    await runCleanupJob()
  }, INTERVAL_MS)
}

async function runCleanupJob() {
  const jobName = 'cleanup-stale-orders'
  await redis.set(`cron:status:${jobName}`, 'running', 'EX', 300)

  const startTime = Date.now()

  try {
    const ordersCleaned = await cleanupStaleOrders()
    const duration = Date.now() - startTime
    const now = new Date().toISOString()

    await redis.set(`cron:last_run:${jobName}`, now)
    await redis.set(
      `cron:result:${jobName}`,
      JSON.stringify({ success: true, ordersCleaned, duration })
    )

    const historyEntry = {
      jobName,
      status: 'success',
      ordersCleaned,
      duration,
      timestamp: now,
    }
    await redis.lpush('cron:history:cleanup-stale-orders', JSON.stringify(historyEntry))
    await redis.ltrim('cron:history:cleanup-stale-orders', 0, 49)

    logInfo(`[Cron] ${jobName} completed: ${ordersCleaned} orders cleaned in ${duration}ms`)
  } catch (error) {
    const duration = Date.now() - startTime
    const now = new Date().toISOString()

    await redis.set(`cron:last_run:${jobName}`, now)
    await redis.set(
      `cron:result:${jobName}`,
      JSON.stringify({ success: false, error: String(error) })
    )

    const historyEntry = {
      jobName,
      status: 'failure',
      error: String(error),
      timestamp: now,
    }
    await redis.lpush('cron:history:cleanup-stale-orders', JSON.stringify(historyEntry))
    await redis.ltrim('cron:history:cleanup-stale-orders', 0, 49)

    logError(`[Cron] ${jobName} failed`, { error: String(error) })
  } finally {
    await redis.set(`cron:status:${jobName}`, 'idle')
  }
}

runCronJobs()
