import { prisma } from '@/lib/prisma'
import { getMarketDataProvider } from '../market-data/MarketDataProvider'
import type { LeaderboardEntry } from '@/types'
import { computeTotalPortfolioValue } from './portfolioValuation'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type LeaderboardQuery = {
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

export class LeaderboardService {
  /**
   * Global leaderboard: all portfolios ranked by live total value (cash + positions at latest quotes).
   */
  async getGlobalLeaderboard(query: LeaderboardQuery = {}): Promise<{
    entries: LeaderboardEntry[]
    total: number
  }> {
    const limit = clampLimit(query.limit)
    const offset = clampOffset(query.offset)

    const portfolios = await prisma.portfolio.findMany({
      include: {
        user: { select: { id: true, name: true } },
        positions: true,
      },
    })

    const symbolSet = new Set<string>()
    for (const p of portfolios) {
      for (const pos of p.positions) {
        symbolSet.add(pos.symbol)
      }
    }
    const symbols = [...symbolSet]

    const priceMap = new Map<string, number>()
    if (symbols.length > 0) {
      const quotes = await getMarketDataProvider().getQuotes(symbols)
      for (const q of quotes) {
        priceMap.set(q.symbol, q.price)
      }
    }

    type Row = {
      portfolioId: string
      portfolioName: string
      userId: string
      displayName: string
      totalPortfolioValue: number
    }

    const rows: Row[] = portfolios.map((pf) => ({
      portfolioId: pf.id,
      portfolioName: pf.name,
      userId: pf.userId,
      displayName: pf.user.name?.trim() || 'User',
      totalPortfolioValue: computeTotalPortfolioValue(
        pf.cashBalance.toNumber(),
        pf.positions,
        priceMap
      ),
    }))

    rows.sort((a, b) => {
      if (b.totalPortfolioValue !== a.totalPortfolioValue) {
        return b.totalPortfolioValue - a.totalPortfolioValue
      }
      return a.portfolioId.localeCompare(b.portfolioId)
    })

    const total = rows.length
    const slice = rows.slice(offset, offset + limit)
    const entries: LeaderboardEntry[] = slice.map((row, i) => ({
      rank: offset + i + 1,
      portfolioId: row.portfolioId,
      portfolioName: row.portfolioName,
      userId: row.userId,
      displayName: row.displayName,
      totalPortfolioValue: row.totalPortfolioValue,
    }))

    return { entries, total }
  }
}

export const leaderboardService = new LeaderboardService()
