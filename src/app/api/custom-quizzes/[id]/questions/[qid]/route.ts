import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const userId = 'temp-user-id' // Replace with actual user ID from session

async function getQuestionAndVerifyOwner(quizId: string, qid: string) {
  const question = await prisma.customQuizQuestion.findUnique({
    where: { id: qid },
    include: { quiz: true },
  })
  if (!question || question.quizId !== quizId) return { question: null, error: 'Not found', status: 404 }
  if (question.quiz.userId !== userId) return { question: null, error: 'Forbidden', status: 403 }
  return { question, error: null, status: 200 }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const { id, qid } = await params
    const { question, error, status } = await getQuestionAndVerifyOwner(id, qid)
    if (!question) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { prompt, options, correctAnswer, context, order } = body

    if (options !== undefined && (!Array.isArray(options) || options.length < 2 || options.length > 6)) {
      return NextResponse.json({ error: 'options must be an array of 2–6 strings' }, { status: 400 })
    }
    const resolvedOptions = options ?? (question.options as string[])
    if (correctAnswer !== undefined && !resolvedOptions.includes(correctAnswer)) {
      return NextResponse.json({ error: 'correctAnswer must be one of the options' }, { status: 400 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const { id, qid } = await params
    const { question, error, status } = await getQuestionAndVerifyOwner(id, qid)
    if (!question) return NextResponse.json({ error }, { status })

    await prisma.customQuizQuestion.delete({ where: { id: qid } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/custom-quizzes/[id]/questions/[qid] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
