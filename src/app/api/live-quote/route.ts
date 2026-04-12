/**
 * GET /api/live-quote?symbol=AAPL
 * Returns latest price from Finnhub (WebSocket cache or REST). For real-time UI and single-symbol views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLiveQuote } from '@/features/market-data/finnhub'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'

/** Finnhub client uses Node `ws`; must not run on Edge. */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')
    if (!symbol?.trim()) {
      return httpErrorResponse('IE_VAL_004', 400)
    }
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey?.trim()) {
      return httpErrorResponse('IE_CFG_001', 503)
    }
    const quote = await getLiveQuote(symbol.trim(), apiKey)
    if (!quote) {
      return NextResponse.json(httpErrorBody('IE_MKT_002'), { status: 404 })
    }
    return NextResponse.json(quote)
  } catch (error) {
    console.error('Live quote API error:', error)
    const message = error instanceof Error ? error.message : ''
    const isRateLimit = message.toLowerCase().includes('rate limit')
    if (isRateLimit) {
      return httpErrorResponse('IE_MKT_001', 503)
    }
    return httpErrorResponse('IE_MKT_003', 500)
  }
}
