import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { getCurrentUser } from '@/lib/auth'
import { sendSSEMessage } from '@/lib/sse'
import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

const SSE_TIMEOUT_MS = 2 * 60 * 1000
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
    start(controller) {
      const encoder = new TextEncoder()
      let aborted = false
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let subscriber: any = null

      const cleanup = async () => {
        if (aborted) return
        aborted = true

        logInfo('SSE connection cleanup', { orderId })
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
            message: 'Payment wait timed out. Please refresh to check status.',
          })))
          controller.close()
          await cleanup()
        }, SSE_TIMEOUT_MS)
      }

      const connect = async () => {
        try {
          subscriber = redis.duplicate()
          subscriber.on('error', (err: Error) => {
            logError('SSE Redis subscriber error', { error: String(err), orderId })
          })

          logInfo('SSE subscribing to channel', { channel: `payment-status:${orderId}` })
          await subscriber.subscribe(`payment-status:${orderId}`)

          subscriber.on('message', async (channel: string, message: string) => {
            if (aborted) return
            if (channel !== `payment-status:${orderId}`) return

            try {
              logInfo('SSE Redis message received', { message, orderId })
              const data = JSON.parse(message)
              logInfo('SSE sending event to frontend', { data, orderId })
              controller.enqueue(encoder.encode(sendSSEMessage(data)))
              controller.close()
              await cleanup()
            } catch (e) {
              logError('SSE error parsing message', { error: String(e), orderId })
            }
          })
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
      logInfo('SSE connection opened', { orderId })
      connect()

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
