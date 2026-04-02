import { Worker, Job } from 'bullmq'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { querySTKStatus } from '@/lib/mpesa'
import { clearCart } from '@/lib/cart'
import { logInfo, logError } from '@/lib/logger'

interface PaymentCheckJobData {
  orderId: string
}

async function processPaymentCheckJob(job: Job<PaymentCheckJobData>): Promise<void> {
  const { orderId } = job.data

  logInfo('Processing payment check job', { orderId })

  const lock = await (redis as any).set(`lock:payment:${orderId}`, '1', 'NX', 'EX', 30)
  if (!lock) {
    logInfo('Payment already being processed, skipping', { orderId })
    return
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    })

    if (!order) {
      logError('Order not found for payment check', { orderId })
      return
    }

    if (order.status === 'PAID') {
      logInfo('Order already paid, skipping check', { orderId })
      return
    }

    if (order.status === 'CANCELLED') {
      logInfo('Order already cancelled, skipping check', { orderId })
      return
    }

    if (!order.mpesaCheckoutRequestId) {
      logInfo('No checkout request ID, skipping check', { orderId })
      return
    }

    const paymentStatus = await querySTKStatus(order.mpesaCheckoutRequestId)

    if (paymentStatus.status === 'success') {
      logInfo('Payment successful via job check', { orderId })

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      })

      await clearCart(order.userId)

      console.log('[Worker] Publishing to Redis for orderId:', orderId)
      await redis.publish(`payment-status:${orderId}`, JSON.stringify({
        status: 'success',
        orderId,
        message: 'Payment confirmed',
      }))
      console.log('[Worker] Redis publish complete')

      await redis.set(`payment-final:${orderId}`, JSON.stringify({ status: 'success' }), 'EX', 86400)

      logInfo('Order updated to PAID via job', { orderId })
    } else if (paymentStatus.status === 'failed') {
      logInfo('Payment failed via job check', { orderId })

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        })

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      })

      await clearCart(order.userId)

      console.log('[Worker] Publishing to Redis for orderId:', orderId)
      await redis.publish(`payment-status:${orderId}`, JSON.stringify({
        status: 'cancelled',
        orderId,
        message: 'Payment status updated',
      }))
      console.log('[Worker] Redis publish complete')

      await redis.set(`payment-final:${orderId}`, JSON.stringify({ status: 'cancelled' }), 'EX', 86400)

      logInfo('Order cancelled and stock restored via job', { orderId })
    } else {
      logInfo('Payment still pending, no action needed', { orderId })
    }
  } catch (error) {
    logError('Error in payment check job', { orderId, error: String(error) })
    throw error
  } finally {
    await redis.del(`lock:payment:${orderId}`)
  }
}

export const paymentCheckWorker = new Worker<PaymentCheckJobData>(
  'payment-check',
  processPaymentCheckJob,
  {
    connection: redis,
    concurrency: 10,
  }
)

paymentCheckWorker.on('completed', (job) => {
  logInfo('Payment check job completed', { jobId: job.id, orderId: job.data.orderId })
})

paymentCheckWorker.on('failed', (job, error) => {
  logError('Payment check job failed', { 
    jobId: job?.id, 
    orderId: job?.data.orderId, 
    error: error.message 
  })
})
