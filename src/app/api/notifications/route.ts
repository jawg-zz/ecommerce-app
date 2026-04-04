import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const unreadOnly = searchParams.get('unread') === 'true'

  const where: Record<string, unknown> = { userId: user.id }
  if (unreadOnly) {
    where.read = false
  }

  try {
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ])

    return NextResponse.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId: user.id },
      })

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const notificationId = searchParams.get('id')

  try {
    if (notificationId) {
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId: user.id },
      })

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      })
    } else {
      await prisma.notification.deleteMany({
        where: { userId: user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}