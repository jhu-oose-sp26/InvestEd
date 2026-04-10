import { NextRequest, NextResponse } from 'next/server'
import { portfolioService } from '@/features/portfolio/PortfolioService'
import { fetchFinnhubCompanyProfile } from '@/features/market-data/finnhub'
import { assertPortfolioOwner, requireAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** GET /api/portfolios/[id] — portfolio summary for an owned portfolio */
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
      return NextResponse.json(
        { error: 'Portfolio not found or access denied' },
        { status: 403 }
      )
    }

    const summary = await portfolioService.getPortfolioSummary(portfolioId)

    const apiKey = process.env.FINNHUB_API_KEY
    if (apiKey?.trim() && summary.positions.length > 0) {
      const sectorResults = await Promise.all(
        summary.positions.map((p) => fetchFinnhubCompanyProfile(p.symbol, apiKey))
      )
      const sectorBySymbol = new Map(
        sectorResults
          .filter((r): r is NonNullable<typeof r> => r != null)
          .map((r) => [r.symbol, r.sector])
      )
      summary.positions = summary.positions.map((p) => ({
        ...p,
        sector: sectorBySymbol.get(p.symbol) ?? 'Unknown',
      }))
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('GET /api/portfolios/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
