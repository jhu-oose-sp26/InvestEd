import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'
import { assertPortfolioOwner, requireAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const portfolioId = request.nextUrl.searchParams.get('portfolioId')
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: portfolioId' },
        { status: 400 }
      )
    }

    const portfolio = await assertPortfolioOwner(portfolioId, auth.user.id)
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found or access denied' },
        { status: 403 }
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
