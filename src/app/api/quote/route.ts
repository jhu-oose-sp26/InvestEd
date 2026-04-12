import { NextRequest, NextResponse } from 'next/server'
import { getMarketDataProvider } from '@/features/market-data/MarketDataProvider'
import { httpErrorResponse } from '@/lib/api/httpErrors'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')

    if (!symbol) {
      return httpErrorResponse('IE_VAL_009', 400)
    }

    const quote = await getMarketDataProvider().getQuote(symbol.toUpperCase())
    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quote API error:', error)
    return httpErrorResponse('IE_MKT_004', 500)
  }
}
