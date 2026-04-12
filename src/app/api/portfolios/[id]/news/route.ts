import { NextRequest, NextResponse } from 'next/server'
import { fetchFinnhubCompanyNews } from '@/features/market-data/finnhub'
import type { FinnhubCompanyNewsItem } from '@/features/market-data/finnhub/types'
import { assertPortfolioOwner, requireAuth } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { PORTFOLIO_NEWS_MAX_SYMBOLS } from '@/lib/portfolioNewsConstants'
import type { PortfolioNewsEntry } from '@/lib/types/portfolioNews'

export const runtime = 'nodejs'

/** Space sequential /company-news calls so we do not burst the shared Finnhub REST limit. */
const REQUEST_GAP_MS = 400

/** Calendar days of news to request. */
const LOOKBACK_DAYS = 14
/** Headlines returned after merge/dedupe. */
const MAX_ITEMS = 40

function formatYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** GET /api/portfolios/[id]/news — headlines for symbols the user currently holds */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { id: portfolioId } = await params
    if (!portfolioId?.trim()) {
      return NextResponse.json({ error: 'Missing portfolio id' }, { status: 400 })
    }

    const portfolio = await assertPortfolioOwner(portfolioId, auth.user.id)
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found or access denied' }, { status: 403 })
    }

    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey?.trim()) {
      return NextResponse.json(
        {
          error: 'Company news not configured',
          hint: 'Set FINNHUB_API_KEY in .env (https://finnhub.io/dashboard)',
          items: [] as PortfolioNewsEntry[],
          symbols: [] as string[],
        },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const positions = await prisma.position.findMany({
      where: { portfolioId, quantity: { gt: 0 } },
      select: { symbol: true },
    })
    const symbols = [...new Set(positions.map((p) => p.symbol.trim().toUpperCase()))]
      .filter(Boolean)
      .slice(0, PORTFOLIO_NEWS_MAX_SYMBOLS)

    if (symbols.length === 0) {
      return NextResponse.json(
        { items: [] as PortfolioNewsEntry[], symbols: [] as string[] },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const to = new Date()
    const from = new Date(to)
    from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS)
    const fromYmd = formatYmdUtc(from)
    const toYmd = formatYmdUtc(to)

    const bySymbol: Array<Array<FinnhubCompanyNewsItem & { symbol: string }>> = []
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]!
      const rows = await fetchFinnhubCompanyNews(symbol, apiKey, fromYmd, toYmd)
      bySymbol.push(rows.map((n) => ({ ...n, symbol })))
      if (i < symbols.length - 1 && REQUEST_GAP_MS > 0) {
        await new Promise((r) => setTimeout(r, REQUEST_GAP_MS))
      }
    }

    const merged = bySymbol.flat()
    const seen = new Set<number>()
    const deduped: PortfolioNewsEntry[] = []
    for (const n of merged) {
      if (seen.has(n.id)) continue
      seen.add(n.id)
      deduped.push({
        id: n.id,
        symbol: n.symbol,
        datetime: n.datetime,
        headline: n.headline,
        source: n.source,
        url: n.url,
        image: n.image,
        category: n.category,
      })
    }

    deduped.sort((a, b) => b.datetime - a.datetime)
    const items = deduped.slice(0, MAX_ITEMS)

    return NextResponse.json(
      { items, symbols },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('GET /api/portfolios/[id]/news error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }
}
