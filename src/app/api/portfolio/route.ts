import { NextRequest, NextResponse } from 'next/server'
import { portfolioService } from '@/features/portfolio/PortfolioService'

export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from authentication session
    // For now, using a placeholder userId - replace with actual auth
    const userId = 'temp-user-id' // Replace with actual user ID from session

    const summary = await portfolioService.getPortfolioSummary(userId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Portfolio API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

