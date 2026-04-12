/**
 * GET /api/live-quotes?symbols=AAPL,MSFT,GOOGL
 * Returns latest prices for multiple symbols. For portfolio graphs, dashboards, multi-symbol UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLiveQuotes } from '@/features/market-data/finnhub'
import { httpErrorResponse } from '@/lib/api/httpErrors'

/** Finnhub client uses Node `ws`; must not run on Edge. */
export const runtime = 'nodejs'
/** Many symbols × serialized /quote can exceed default serverless timeouts on cold start. */
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const symbolsParam = request.nextUrl.searchParams.get('symbols')
    const symbols = symbolsParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
    if (symbols.length === 0) {
      return httpErrorResponse('IE_VAL_005', 400)
    }
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey?.trim()) {
      return httpErrorResponse('IE_CFG_001', 503)
    }
    let quotes = await getLiveQuotes(symbols, apiKey)
    if (quotes.length === 0 && symbols.length > 0) {
      await new Promise((r) => setTimeout(r, 600))
      quotes = await getLiveQuotes(symbols, apiKey)
    }
    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Live quotes API error:', error)
    const message = error instanceof Error ? error.message : ''
    const isRateLimit = message.toLowerCase().includes('rate limit')
    if (isRateLimit) {
      return httpErrorResponse('IE_MKT_001', 503)
    }
    return httpErrorResponse('IE_MKT_003', 500)
  }
}
