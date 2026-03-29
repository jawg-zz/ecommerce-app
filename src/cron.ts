import { cleanupStaleOrders } from './lib/cron/cleanup-stale-orders'

const INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

async function runCronJobs() {
  console.log('Cron service started')
  console.log(`Running cleanup every ${INTERVAL_MS / 1000 / 60} minutes`)

  // Run immediately on startup
  await cleanupStaleOrders().catch(err => {
    console.error('Cron job failed:', err)
  })

  // Then run on interval
  setInterval(async () => {
    await cleanupStaleOrders().catch(err => {
      console.error('Cron job failed:', err)
    })
  }, INTERVAL_MS)
}

runCronJobs()
