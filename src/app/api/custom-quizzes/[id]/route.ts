import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const userId = 'temp-user-id' // Replace with actual user ID from session

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!quiz.isPublic && quiz.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('GET /api/custom-quizzes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } })

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { title, description, isPublic } = body

    if (isPublic === true && quiz._count.questions === 0) {
      return NextResponse.json(
        { error: 'A quiz must have at least one question to be made public' },
        { status: 422 }
      )
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
    }

    const updated = await prisma.customQuiz.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/custom-quizzes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id } })

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.customQuiz.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/custom-quizzes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
