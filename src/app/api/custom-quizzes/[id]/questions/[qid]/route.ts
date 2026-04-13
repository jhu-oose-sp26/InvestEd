import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { HttpErrorCode } from '@/lib/api/httpErrors'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'
import { requireAuth } from '@/lib/auth/server'

async function getQuestionAndVerifyOwner(quizId: string, qid: string, userId: string) {
  const question = await prisma.customQuizQuestion.findUnique({
    where: { id: qid },
    include: { quiz: true },
  })
  if (!question || question.quizId !== quizId) {
    return { ok: false as const, error: 'IE_QZ_404' as HttpErrorCode, status: 404 }
  }
  if (question.quiz.userId !== userId) {
    return { ok: false as const, error: 'IE_QZ_403' as HttpErrorCode, status: 403 }
  }
  return { ok: true as const, question }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id, qid } = await params
    const gate = await getQuestionAndVerifyOwner(id, qid, userId)
    if (!gate.ok) {
      return NextResponse.json(httpErrorBody(gate.error), { status: gate.status })
    }
    const { question } = gate

    const body = await request.json()
    const { prompt, options, correctAnswer, context, order } = body

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
        return httpErrorResponse('IE_QZ_V10', 400)
      }
      if (options.some((o: unknown) => typeof o !== 'string' || String(o).trim().length === 0)) {
        return httpErrorResponse('IE_QZ_V11', 400)
      }
    }
    const resolvedOptions = (options ?? question.options) as string[]
    const resolvedCorrectAnswer = correctAnswer ?? question.correctAnswer
    if (!resolvedOptions.includes(resolvedCorrectAnswer)) {
      return httpErrorResponse('IE_QZ_V12', 400)
    }

    const updated = await prisma.customQuizQuestion.update({
      where: { id: qid },
      data: {
        ...(prompt !== undefined && { prompt: prompt.trim() }),
        ...(options !== undefined && { options }),
        ...(correctAnswer !== undefined && { correctAnswer }),
        ...(context !== undefined && { context: context?.trim() ?? null }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/custom-quizzes/[id]/questions/[qid] error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id, qid } = await params
    const gate = await getQuestionAndVerifyOwner(id, qid, userId)
    if (!gate.ok) {
      return NextResponse.json(httpErrorBody(gate.error), { status: gate.status })
    }

    await prisma.customQuizQuestion.delete({ where: { id: qid } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/custom-quizzes/[id]/questions/[qid] error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}
