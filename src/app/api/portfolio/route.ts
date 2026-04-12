import { NextRequest, NextResponse } from 'next/server'
import { portfolioService } from '@/features/portfolio/PortfolioService'
import { fetchFinnhubCompanyProfile } from '@/features/market-data/finnhub'
import { httpErrorResponse } from '@/lib/api/httpErrors'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** GET /api/portfolio — summary for the signed-in user’s first portfolio (same shape as /api/portfolios/[id]). */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!portfolio) {
      return NextResponse.json(
        {
          error:
            'No portfolio found for this account yet. Sign out and sign in again, or contact support if this continues.',
        },
        { status: 404 }
      )
    }

    const summary = await portfolioService.getPortfolioSummary(portfolio.id)

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
    console.error('Portfolio API error:', error)
    return httpErrorResponse('IE_PFO_001', 500)
  }
}
