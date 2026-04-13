import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'
import { requireAuth } from '@/lib/auth/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id } })

    if (!quiz) return NextResponse.json(httpErrorBody('IE_QZ_404'), { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json(httpErrorBody('IE_QZ_403'), { status: 403 })

    const body = await request.json()
    const { prompt, options, correctAnswer, context, order } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return httpErrorResponse('IE_QZ_V06', 400)
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return httpErrorResponse('IE_QZ_V07', 400)
    }
    if (options.some((o: unknown) => typeof o !== 'string' || String(o).trim().length === 0)) {
      return httpErrorResponse('IE_QZ_V08', 400)
    }
    if (!correctAnswer || !options.includes(correctAnswer)) {
      return httpErrorResponse('IE_QZ_V09', 400)
    }

    let questionOrder = typeof order === 'number' ? order : 0
    if (typeof order !== 'number') {
      const last = await prisma.customQuizQuestion.findFirst({
        where: { quizId: id },
        orderBy: { order: 'desc' },
      })
      questionOrder = (last?.order ?? -1) + 1
    }

    const question = await prisma.customQuizQuestion.create({
      data: {
        quizId: id,
        prompt: prompt.trim(),
        options,
        correctAnswer,
        context: context?.trim() ?? null,
        order: questionOrder,
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error('POST /api/custom-quizzes/[id]/questions error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}
