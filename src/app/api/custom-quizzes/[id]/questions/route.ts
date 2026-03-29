import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const userId = 'temp-user-id' // Replace with actual user ID from session

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await prisma.customQuiz.findUnique({ where: { id } })

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (quiz.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { prompt, options, correctAnswer, context, order } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json({ error: 'options must be an array of 2–6 strings' }, { status: 400 })
    }
    if (!correctAnswer || !options.includes(correctAnswer)) {
      return NextResponse.json({ error: 'correctAnswer must be one of the options' }, { status: 400 })
    }

    // Auto-assign order as max existing + 1 if not provided
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
