import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'
import { assertPortfolioOwner, requireAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** GET /api/portfolios/[id]/history — value history for an owned portfolio */
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

    const points = await getPortfolioValueHistory(portfolioId)
    return NextResponse.json({ points })
  } catch (error) {
    console.error('GET /api/portfolios/[id]/history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
