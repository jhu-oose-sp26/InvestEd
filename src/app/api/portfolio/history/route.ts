import { NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'
import { httpErrorResponse } from '@/lib/api/httpErrors'

export async function GET() {
  try {
    const userId = 'temp-user-id'

    const points = await getPortfolioValueHistory(userId)
    return NextResponse.json({ points })
  } catch (error) {
    console.error('Portfolio history API error:', error)
    return httpErrorResponse('IE_PFO_002', 500)
  }
}
