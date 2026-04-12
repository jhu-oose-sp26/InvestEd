import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { httpErrorResponse } from '@/lib/api/httpErrors'

const userId = 'temp-user-id'

export async function GET() {
  try {
    const quizzes = await prisma.customQuiz.findMany({
      where: { OR: [{ isPublic: true }, { userId }] },
      include: { _count: { select: { questions: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(quizzes)
  } catch (error) {
    console.error('GET /api/custom-quizzes error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, isPublic } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return httpErrorResponse('IE_QZ_V01', 400)
    }
    if (title.length > 200) {
      return httpErrorResponse('IE_QZ_V02', 400)
    }

    const quiz = await prisma.customQuiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? null,
        isPublic: Boolean(isPublic),
        userId,
      },
    })

    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    console.error('POST /api/custom-quizzes error:', error)
    return httpErrorResponse('IE_QZ_SRV', 500)
  }
}
