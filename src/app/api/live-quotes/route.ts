/**
 * GET /api/live-quotes?symbols=AAPL,MSFT,GOOGL
 * Returns latest prices for multiple symbols. For portfolio graphs, dashboards, multi-symbol UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLiveQuotes } from '@/features/market-data/finnhub'

/** Finnhub client uses Node `ws`; must not run on Edge. */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const symbolsParam = request.nextUrl.searchParams.get('symbols')
    const symbols = symbolsParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
    if (symbols.length === 0) {
      return NextResponse.json({ error: 'Missing or empty query parameter: symbols (comma-separated)' }, { status: 400 })
    }
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: 'Real-time quotes not configured', hint: 'Set FINNHUB_API_KEY in .env (https://finnhub.io/dashboard)' },
        { status: 503 }
      )
    }
    const quotes = await getLiveQuotes(symbols, apiKey)
    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Live quotes API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
