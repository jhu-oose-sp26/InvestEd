/**
 * GET /api/live-quote?symbol=AAPL
 * Returns latest price from Finnhub (WebSocket cache or REST). For real-time UI and single-symbol views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLiveQuote } from '@finnhub-data-pipeline'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')
    if (!symbol?.trim()) {
      return NextResponse.json({ error: 'Missing query parameter: symbol' }, { status: 400 })
    }
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: 'Real-time quotes not configured', hint: 'Set FINNHUB_API_KEY in .env (https://finnhub.io/dashboard)' },
        { status: 503 }
      )
    }
    const quote = await getLiveQuote(symbol.trim(), apiKey)
    if (!quote) {
      return NextResponse.json({ error: `No quote for symbol: ${symbol}` }, { status: 404 })
    }
    return NextResponse.json(quote)
  } catch (error) {
    console.error('Live quote API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
