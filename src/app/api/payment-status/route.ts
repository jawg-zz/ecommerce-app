import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendSSEMessage } from '@/lib/sse'

const SSE_TIMEOUT_MS = 2 * 60 * 1000
const POLL_INTERVAL_MS = 1000
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
  })

  if (!order) {
    return new Response('Order not found', { status: 404 })
  }

  if (order.userId !== user.id) {
    return new Response('Unauthorized', { status: 403 })
  }

  if (order.status === 'PAID') {
    const encoder = new TextEncoder()
    return new Response(encoder.encode(sendSSEMessage({
      status: 'success',
      orderId,
      message: 'Payment confirmed',
    })), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  if (order.status === 'CANCELLED') {
    const encoder = new TextEncoder()
    return new Response(encoder.encode(sendSSEMessage({
      status: 'cancelled',
      orderId,
      message: 'Payment cancelled',
    })), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let lastStatus = order.status
      let startTime = Date.now()
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null
      let pollInterval: ReturnType<typeof setInterval> | null = null
      let aborted = false

      const heartbeat = () => {
        if (aborted) return
        controller.enqueue(encoder.encode(sendSSEMessage({ type: 'heartbeat' })))
      }

      heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)

      const checkStatus = async () => {
        if (aborted) return

        if (Date.now() - startTime >= SSE_TIMEOUT_MS) {
          if (aborted) return
          controller.enqueue(encoder.encode(sendSSEMessage({
            status: 'timeout',
            orderId,
            message: 'Payment wait timed out. Please refresh to check status.',
          })))
          controller.close()
          if (heartbeatInterval) clearInterval(heartbeatInterval)
          if (pollInterval) clearInterval(pollInterval)
          return
        }

        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        })

        if (!currentOrder || aborted) return

        if (currentOrder.status !== lastStatus) {
          if (currentOrder.status === 'PAID') {
            controller.enqueue(encoder.encode(sendSSEMessage({
              status: 'success',
              orderId,
              message: 'Payment confirmed',
            })))
            controller.close()
            if (heartbeatInterval) clearInterval(heartbeatInterval)
            if (pollInterval) clearInterval(pollInterval)
          } else if (currentOrder.status === 'CANCELLED') {
            controller.enqueue(encoder.encode(sendSSEMessage({
              status: 'cancelled',
              orderId,
              message: 'Payment cancelled by user',
            })))
            controller.close()
            if (heartbeatInterval) clearInterval(heartbeatInterval)
            if (pollInterval) clearInterval(pollInterval)
          }
        }

        lastStatus = currentOrder.status
      }

      pollInterval = setInterval(checkStatus, POLL_INTERVAL_MS)

      request.signal.addEventListener('abort', () => {
        aborted = true
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        if (pollInterval) clearInterval(pollInterval)
        controller.close()
      })

      checkStatus()
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
