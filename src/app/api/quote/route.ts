import { NextRequest, NextResponse } from 'next/server'
import { getMarketDataProvider } from '@/features/market-data/MarketDataProvider'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required query parameter: symbol' },
        { status: 400 }
      )
    }

    const quote = await getMarketDataProvider().getQuote(symbol.toUpperCase())
    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quote API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
