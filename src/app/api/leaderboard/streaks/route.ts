import { NextRequest, NextResponse } from 'next/server'
import { streakLeaderboardService } from '@/features/quiz/StreakLeaderboardService'

export const runtime = 'nodejs'

/** GET /api/leaderboard/streaks — global daily-quiz streak leaderboard (public) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam != null && limitParam !== '' ? Number(limitParam) : undefined
    const offset = offsetParam != null && offsetParam !== '' ? Number(offsetParam) : undefined

    const { entries, total } = await streakLeaderboardService.getGlobalStreakLeaderboard({
      limit,
      offset,
    })

    return NextResponse.json({ entries, total })
  } catch (error) {
    console.error('GET /api/leaderboard/streaks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
