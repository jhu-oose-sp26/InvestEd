/**
 * Finnhub REST Quote API client.
 * GET /quote?symbol=X – use for one-off fetches and fallback when WS cache is stale.
 */

import type { FinnhubQuoteResponse, FinnhubLiveQuote } from './types'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

export async function fetchFinnhubQuote(symbol: string, apiKey: string): Promise<FinnhubLiveQuote> {
  if (!apiKey.trim()) throw new Error('Finnhub API key is required')
  const url = new URL(`${FINNHUB_BASE}/quote`)
  url.searchParams.set('symbol', symbol.toUpperCase())
  url.searchParams.set('token', apiKey)

  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Cache-Control': 'no-store' } })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Finnhub rate limit exceeded')
    throw new Error(`Finnhub quote failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as FinnhubQuoteResponse
  const price = data?.c
  if (typeof price !== 'number') {
    throw new Error('Finnhub quote missing current price (market may be closed or symbol invalid)')
  }
  return {
    symbol: symbol.toUpperCase(),
    price,
    timestamp: (data.t ?? Date.now() / 1000) * 1000,
    change: data.d,
    percentChange: data.dp,
  }
}
