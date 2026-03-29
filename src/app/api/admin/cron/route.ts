import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { cleanupStaleOrders } from '@/lib/cron/cleanup-stale-orders'

interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  lastRun?: number
  lastResult?: {
    success: boolean
    ordersProcessed?: number
    error?: string
  }
}

const CRON_JOBS: CronJob[] = [
  {
    id: 'cleanup-stale-orders',
    name: 'Cleanup Stale Orders',
    description: 'Cancels orders that remain in PENDING status for more than 15 minutes',
    schedule: 'Every 10 minutes',
  },
]

export async function GET() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch job status and history from Redis
    const jobs = []
    
    // Cleanup stale orders job
    const jobId = 'cleanup-stale-orders'
    const status = await redis.get(`cron:status:${jobId}`)
    const lastRun = await redis.get(`cron:last_run:${jobId}`)
    const resultStr = await redis.get(`cron:result:${jobId}`)
    const result = resultStr ? JSON.parse(resultStr) : null
    
    jobs.push({
      id: jobId,
      name: 'Cleanup Stale Orders',
      description: 'Cancels orders that remain in PENDING status for more than 15 minutes',
      schedule: 'Every 10 minutes',
      status: status || 'idle',
      lastRun: lastRun || undefined,
      result: result || undefined,
    })

    // Fetch history
    const historyItems = await redis.lrange('cron:history:cleanup-stale-orders', 0, 9)
    const history = historyItems.map(item => JSON.parse(item))

    return NextResponse.json({ jobs, history })
  } catch (error) {
    console.error('Error fetching cron status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cron status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action } = await request.json()

    if (action === 'cleanup-stale-orders') {
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

        await redis.set(`cron:status:${jobName}`, 'idle')

        return NextResponse.json({
          success: true,
          message: 'Cleanup job executed successfully',
          ordersCleaned,
        })
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

        await redis.set(`cron:status:${jobName}`, 'idle')

        throw error
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error executing cron job:', error)
    return NextResponse.json(
      { error: 'Failed to execute cron job' },
      { status: 500 }
    )
  }
}
