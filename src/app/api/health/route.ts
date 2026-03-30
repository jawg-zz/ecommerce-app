import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    health.services.database = 'healthy'
  } catch {
    health.services.database = 'unhealthy'
    health.status = 'degraded'
  }

  try {
    await redis.ping()
    health.services.redis = 'healthy'
  } catch {
    health.services.redis = 'unhealthy'
    health.status = 'degraded'
  }

  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: {
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
