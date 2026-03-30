import { NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'

export async function GET() {
  try {
    const userId = 'temp-user-id'

    const points = await getPortfolioValueHistory(userId)
    return NextResponse.json({ points })
  } catch (error) {
    console.error('Portfolio history API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
