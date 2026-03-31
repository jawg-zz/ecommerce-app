import { Queue, QueueEvents } from 'bullmq'
import { redis } from './redis'

export const PAYMENT_CHECK_QUEUE_NAME = 'payment-check'

export const paymentCheckQueue = new Queue(PAYMENT_CHECK_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
})

export const paymentCheckQueueEvents = new QueueEvents(PAYMENT_CHECK_QUEUE_NAME, {
  connection: redis,
})

export async function schedulePaymentCheck(orderId: string, delay: number): Promise<void> {
  await paymentCheckQueue.add(
    'payment-check',
    { orderId },
    {
      jobId: `payment-check-${orderId}`,
      delay,
      removeOnComplete: true,
      removeOnFail: 100,
    }
  )
}

export async function cancelPaymentCheck(orderId: string): Promise<void> {
  const job = await paymentCheckQueue.getJob(`payment-check-${orderId}`)
  if (job) {
    await job.remove()
  }
}