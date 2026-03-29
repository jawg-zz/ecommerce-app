import { prisma } from '../prisma'
import { logInfo, logError } from '../logger'

const TIMEOUT_MINUTES = 15

export async function cleanupStaleOrders(): Promise<number> {
  const cutoffTime = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000)

  logInfo(`Checking for stale orders older than ${TIMEOUT_MINUTES} minutes`)

  try {
    const staleOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoffTime },
      },
      include: { items: true },
    })

    if (staleOrders.length === 0) {
      logInfo('No stale orders found')
      return 0
    }

    logInfo(`Found ${staleOrders.length} stale orders to cancel`)

    for (const order of staleOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })

      logInfo(`Cancelled order ${order.id}`, { createdAt: order.createdAt })
    }

    logInfo(`Successfully cleaned up ${staleOrders.length} stale orders`)
    return staleOrders.length
  } catch (error) {
    logError('Error cleaning up stale orders', { error: String(error) })
    throw error
  }
}
