import { NextRequest, NextResponse } from 'next/server'
import { marketService } from '@/features/trading/MarketService'

export async function POST(request: NextRequest) {
  try {
    const { title, description, resolutionDate } = await request.json()
    const creatorId = 'temp-user-id' // TODO: replace with auth session

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
    const { marketId, outcome } = await request.json()
    if (typeof marketId !== 'string' || typeof outcome !== 'boolean') {
      return NextResponse.json({ error: 'marketId (string) and outcome (boolean) required' }, { status: 400 })
    }
    const result = await marketService.resolveMarket(marketId, outcome)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
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
