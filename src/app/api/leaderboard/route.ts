import { NextRequest, NextResponse } from 'next/server'
import { leaderboardService } from '@/features/portfolio/LeaderboardService'

export const runtime = 'nodejs'

/** GET /api/leaderboard — global portfolio value leaderboard (public) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam != null && limitParam !== '' ? Number(limitParam) : undefined
    const offset = offsetParam != null && offsetParam !== '' ? Number(offsetParam) : undefined

    const { entries, total } = await leaderboardService.getGlobalLeaderboard({ limit, offset })

    return NextResponse.json({ entries, total })
  } catch (error) {
    console.error('GET /api/leaderboard error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
