import { NextRequest, NextResponse } from 'next/server'
import { getDailyQuestions } from '@/features/quiz/quizService'
import { httpErrorResponse } from '@/lib/api/httpErrors'

function getDateString(req: NextRequest): string {
  const dateParam = req.nextUrl.searchParams.get('date')
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam
  }
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const dateStr = getDateString(request)
    const result = await getDailyQuestions(dateStr)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Quiz questions API error:', error)
    const message = error instanceof Error ? error.message : ''
    const noData = message.includes('ENOENT') || message.includes('not found')
    if (noData) {
      return httpErrorResponse('IE_QDAILY_001', 503)
    }
    return httpErrorResponse('IE_QDAILY_002', 500)
  }
}
