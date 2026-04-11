import { NextRequest, NextResponse } from 'next/server'
import { orderBookService } from '@/features/trading/OrderBookService'

export async function GET(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get('marketId')
  if (!marketId) {
    return NextResponse.json({ error: 'Missing marketId parameter' }, { status: 400 })
  }

  try {
    const orderBook = await orderBookService.getOrderBook(marketId)
    return NextResponse.json(orderBook)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
