import { prisma } from '@/lib/prisma'
import type { StreakLeaderboardEntry } from '@/types/quiz'
import {
  computeDisplayCurrentStreakFromMap,
  utcTodayString,
} from '@/features/quiz/quizStreakService'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type StreakLeaderboardQuery = {
  limit?: number
  offset?: number
}

function clampLimit(raw: number | undefined): number {
  if (raw == null || Number.isNaN(raw)) return DEFAULT_LIMIT
  const n = Math.floor(raw)
  if (n <= 0) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

function clampOffset(raw: number | undefined): number {
  if (raw == null || Number.isNaN(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

export class StreakLeaderboardService {
  /**
   * Global leaderboard: all users ranked by display current streak (UTC),
   * same as /api/auth/me quizStreak.currentStreak.
   */
  async getGlobalStreakLeaderboard(query: StreakLeaderboardQuery = {}): Promise<{
    entries: StreakLeaderboardEntry[]
    total: number
  }> {
    const limit = clampLimit(query.limit)
    const offset = clampOffset(query.offset)
    const today = utcTodayString()

    const [users, results] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true },
      }),
      prisma.dailyQuizResult.findMany({
        select: { userId: true, quizDate: true, passed: true },
      }),
    ])

    const byUser = new Map<string, Map<string, boolean>>()
    for (const r of results) {
      let m = byUser.get(r.userId)
      if (!m) {
        m = new Map()
        byUser.set(r.userId, m)
      }
      m.set(r.quizDate, r.passed)
    }

    type Row = {
      userId: string
      displayName: string
      currentStreak: number
    }

    const rows: Row[] = users.map((u) => {
      const map = byUser.get(u.id) ?? new Map<string, boolean>()
      return {
        userId: u.id,
        displayName: u.name?.trim() || 'User',
        currentStreak: computeDisplayCurrentStreakFromMap(map, today),
      }
    })

    rows.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak
      }
      return a.userId.localeCompare(b.userId)
    })

    const total = rows.length
    const slice = rows.slice(offset, offset + limit)
    const entries: StreakLeaderboardEntry[] = slice.map((row, i) => ({
      rank: offset + i + 1,
      userId: row.userId,
      displayName: row.displayName,
      currentStreak: row.currentStreak,
    }))

    return { entries, total }
  }
}

export const streakLeaderboardService = new StreakLeaderboardService()
