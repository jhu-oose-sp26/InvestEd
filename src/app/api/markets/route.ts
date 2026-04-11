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

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') as 'OPEN' | 'RESOLVED' | 'CANCELLED' | null
    const markets = await marketService.listMarkets(status ?? undefined)
    return NextResponse.json({ markets })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
