import { NextRequest, NextResponse } from 'next/server'
import { marketService } from '@/features/trading/MarketService'
import { requireAuth } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { title, description, resolutionDate } = await request.json()
    const creatorId = auth.user.id

    const result = await marketService.createMarket({ creatorId, title, description, resolutionDate })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { marketId, outcome } = await request.json()
    if (typeof marketId !== 'string' || typeof outcome !== 'boolean') {
      return NextResponse.json({ error: 'marketId (string) and outcome (boolean) required' }, { status: 400 })
    }
    const result = await marketService.resolveMarket(marketId, outcome, auth.user.id)
    if (!result.success) {
      const status = result.error?.startsWith('FORBIDDEN:') ? 403 : 400
      const error = result.error?.replace(/^FORBIDDEN:\s*/, '') ?? 'Failed to resolve'
      return NextResponse.json({ error }, { status })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const VALID_STATUSES = ['OPEN', 'RESOLVED', 'CANCELLED'] as const
type MarketStatus = typeof VALID_STATUSES[number]

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    if (statusParam && !VALID_STATUSES.includes(statusParam as MarketStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }
    const markets = await marketService.listMarkets((statusParam as MarketStatus) ?? undefined)
    return NextResponse.json({ markets })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
