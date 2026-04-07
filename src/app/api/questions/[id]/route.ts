import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: questionId } = await params
  
  try {
    const question = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error('Failed to fetch question:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { id: questionId } = await params

  try {
    const existingQuestion = await prisma.productQuestion.findUnique({
      where: { id: questionId },
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { answer } = body

    if (!answer) {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      )
    }

    const question = await prisma.productQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer.trim(),
        answeredBy: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error('Failed to answer question:', error)
    return NextResponse.json(
      { error: 'Failed to answer question' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const { id: questionId } = await params

  try {
    const existingQuestion = await prisma.productQuestion.findUnique({
      where: { id: questionId },
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    if (existingQuestion.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only delete your own questions' },
        { status: 403 }
      )
    }

    await prisma.productQuestion.delete({
      where: { id: questionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete question:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
}