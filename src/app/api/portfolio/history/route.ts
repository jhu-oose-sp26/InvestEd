import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioValueHistory } from '@/features/portfolio/PortfolioHistoryService'
import { httpErrorResponse } from '@/lib/api/httpErrors'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

/** GET /api/portfolio/history — value history for the signed-in user’s first portfolio */
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

    const points = await getPortfolioValueHistory(portfolio.id)
    return NextResponse.json({ points })
  } catch (error) {
    console.error('Portfolio history API error:', error)
    return httpErrorResponse('IE_PFO_002', 500)
  }
}
