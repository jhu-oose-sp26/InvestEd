import { NextRequest, NextResponse } from 'next/server'
import { portfolioService } from '@/features/portfolio/PortfolioService'
import { fetchFinnhubCompanyProfile } from '@finnhub-data-pipeline'
import { httpErrorResponse } from '@/lib/api/httpErrors'

export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from authentication session
    // For now, using a placeholder userId - replace with actual auth
    const userId = 'temp-user-id' // Replace with actual user ID from session

    const summary = await portfolioService.getPortfolioSummary(userId)

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

