import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'

export async function GET(request: NextRequest) {
  try {
    const portfolioId = request.nextUrl.searchParams.get('portfolioId')
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: portfolioId' },
        { status: 400 }
      )
    }

    const points = await getPortfolioValueHistory(portfolioId)
    return NextResponse.json({ points })
  } catch (error) {
    console.error('Portfolio history API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
