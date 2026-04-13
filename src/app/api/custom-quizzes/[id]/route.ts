import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'
import { requireAuth } from '@/lib/auth/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    if (!quiz) return NextResponse.json(httpErrorBody('IE_QZ_404'), { status: 404 })
    if (!quiz.isPublic && quiz.userId !== userId) {
      return NextResponse.json(httpErrorBody('IE_QZ_403'), { status: 403 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('GET /api/custom-quizzes/[id] error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } })

    if (!quiz) return NextResponse.json(httpErrorBody('IE_QZ_404'), { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json(httpErrorBody('IE_QZ_403'), { status: 403 })

    const body = await request.json()
    const { title, description, isPublic } = body

    if (isPublic === true && quiz._count.questions === 0) {
      return httpErrorResponse('IE_QZ_V03', 422)
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return httpErrorResponse('IE_QZ_V04', 400)
      }
      if (title.length > 200) {
        return httpErrorResponse('IE_QZ_V05', 400)
      }
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
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id } })

    if (!quiz) return NextResponse.json(httpErrorBody('IE_QZ_404'), { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json(httpErrorBody('IE_QZ_403'), { status: 403 })

    await prisma.customQuiz.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/custom-quizzes/[id] error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}
