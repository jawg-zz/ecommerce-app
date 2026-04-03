import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { getCurrentUser } from '@/lib/auth'
import { sendSSEMessage } from '@/lib/sse'
import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000
const SSE_TIMEOUT_MS = PAYMENT_TIMEOUT_MS
const HEARTBEAT_INTERVAL_MS = 15000

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return new Response('Missing orderId', { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  })

  if (!order || order.userId !== user.id) {
    return new Response('Not Found', { status: 404 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let aborted = false
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let subscriber: any = null

      const cleanup = async () => {
        if (aborted) return
        aborted = true

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        if (subscriber) {
          try {
            await subscriber.unsubscribe(`payment-status:${orderId}`)
            await subscriber.quit()
          } catch (e) {
            // Ignore cleanup errors
          }
          subscriber = null
        }
      }

      const heartbeat = () => {
        if (aborted) return
        controller.enqueue(encoder.encode(sendSSEMessage({ type: 'heartbeat' })))
      }

      const startHeartbeat = () => {
        heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
      }

      const startTimeout = () => {
        timeoutId = setTimeout(async () => {
          if (aborted) return
          controller.enqueue(encoder.encode(sendSSEMessage({
            status: 'timeout',
            orderId,
            message: 'Connection timed out, but your payment may still be processing. Please check your M-Pesa messages.',
          })))
          controller.close()
          await cleanup()
        }, SSE_TIMEOUT_MS)
      }

      const connect = async () => {
        try {
          console.log('[SSE] Client connected for orderId:', orderId)

          subscriber = redis.duplicate()
          subscriber.on('error', (err: Error) => {
            logError('SSE Redis subscriber error', { error: String(err), orderId })
          })

          console.log('[SSE] Subscriber connected, status:', subscriber.status)

          subscriber.on('message', async (channel: string, message: string) => {
            console.log('[SSE] MESSAGE HANDLER CALLED')
            console.log('[SSE] Received message from Redis:', channel, message)
            if (aborted) return
            if (channel !== `payment-status:${orderId}`) return

            try {
              const data = JSON.parse(message)
              console.log('[SSE] Enqueuing message to client:', data)
              controller.enqueue(encoder.encode(sendSSEMessage(data)))
              console.log('[SSE] Message enqueued, waiting for flush...')

              // Wait a bit to ensure the message is flushed to the client
              await new Promise(resolve => setTimeout(resolve, 100))

              console.log('[SSE] Closing stream')
              controller.close()
              await cleanup()
            } catch (e) {
              logError('SSE error parsing message', { error: String(e), orderId })
            }
          })
          console.log('[SSE] Message handler attached')

          await subscriber.subscribe(`payment-status:${orderId}`)
          console.log('[SSE] Subscribed to channel:', `payment-status:${orderId}`)
          console.log('[SSE] Subscriber status:', subscriber.status)
          console.log('[SSE] Subscriber mode:', subscriber.mode)
        } catch (e) {
          logError('SSE failed to setup Redis subscriber', { error: String(e), orderId })
          if (!aborted) {
            controller.enqueue(encoder.encode(sendSSEMessage({
              status: 'error',
              orderId,
              message: 'Connection error. Please refresh.',
            })))
            controller.close()
          }
        }
      }

      startHeartbeat()
      startTimeout()
      await connect()

      request.signal.addEventListener('abort', async () => {
        await cleanup()
        try {
          controller.close()
        } catch (e) {
          // Controller may already be closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
