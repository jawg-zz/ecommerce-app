import { prisma } from '../prisma'

const TIMEOUT_MINUTES = 15

export async function cleanupStaleOrders(): Promise<number> {
  const cutoffTime = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000)

  console.log(`[${new Date().toISOString()}] Checking for stale orders older than ${TIMEOUT_MINUTES} minutes...`)

  try {
    // Find stale pending orders
    const staleOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoffTime },
      },
      include: { items: true },
    })

    if (staleOrders.length === 0) {
      console.log('No stale orders found')
      return 0
    }

    console.log(`Found ${staleOrders.length} stale orders to cancel`)

    // Cancel each stale order
    for (const order of staleOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })

      console.log(`Cancelled order ${order.id} (created at ${order.createdAt})`)
    }

    console.log(`Successfully cleaned up ${staleOrders.length} stale orders`)
    return staleOrders.length
  } catch (error) {
    console.error('Error cleaning up stale orders:', error)
    throw error
  }
}
