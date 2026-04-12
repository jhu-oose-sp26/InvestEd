import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { completeDailyQuiz } from '@/features/quiz/quizStreakService'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 })
    }

    const { date, answers } = body as { date?: unknown; answers?: unknown }
    if (typeof date !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid date' }, { status: 400 })
    }
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing or invalid answers' }, { status: 400 })
    }

    const answerMap: Record<string, string> = {}
    for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
      if (typeof v === 'string') answerMap[k] = v
    }

    const result = await completeDailyQuiz(auth.user.id, date, answerMap)
    return NextResponse.json({
      correctCount: result.correctCount,
      total: result.total,
      passed: result.passed,
      streak: result.streak,
      longestStreak: result.longestStreak,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'INVALID_DATE') {
      return NextResponse.json({ error: 'Invalid date — use YYYY-MM-DD' }, { status: 400 })
    }
    if (msg === 'FUTURE_DATE') {
      return NextResponse.json({ error: 'Cannot submit a future quiz date' }, { status: 400 })
    }
    if (msg === 'NO_QUESTIONS') {
      return NextResponse.json(
        { error: 'No questions available for that date' },
        { status: 503 }
      )
    }
    console.error('POST /api/quiz/complete:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
