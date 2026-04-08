import { NextRequest, NextResponse } from 'next/server'
import { portfolioService } from '@/features/portfolio/PortfolioService'
import { fetchFinnhubCompanyProfile } from '@/features/market-data/finnhub'

export async function GET(request: NextRequest) {
  try {
    const portfolioId = request.nextUrl.searchParams.get('portfolioId')
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: portfolioId' },
        { status: 400 }
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
    console.error('Portfolio API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

