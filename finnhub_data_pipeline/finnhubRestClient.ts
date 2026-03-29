/**
 * Finnhub REST Quote API client.
 * GET /quote?symbol=X – use for one-off fetches and fallback when WS cache is stale.
 * GET /stock/profile2?symbol=X – company profile (sector/industry) for portfolio charts.
 */

import type {
  FinnhubQuoteResponse,
  FinnhubLiveQuote,
  FinnhubQuoteSnapshot,
  FinnhubCompanyProfile2Response,
  FinnhubCompanyProfile,
} from './types'

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

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Finnhub GET /quote with all fields needed for Supabase `market_quote_snapshots` and future candlestick inputs.
 */
export async function fetchFinnhubQuoteSnapshot(
  symbol: string,
  apiKey: string,
): Promise<FinnhubQuoteSnapshot> {
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
  const tSec = typeof data.t === 'number' ? data.t : Math.floor(Date.now() / 1000)
  return {
    symbol: symbol.toUpperCase(),
    observedAtIso: new Date(tSec * 1000).toISOString(),
    lastPrice: price,
    dayOpen: num(data.o),
    dayHigh: num(data.h),
    dayLow: num(data.l),
    prevClose: num(data.pc),
    changeAbs: num(data.d),
    changePct: num(data.dp),
  }
}

const PROFILE2_BASE = 'https://finnhub.io/api/v1/stock/profile2'

export async function fetchFinnhubCompanyProfile(
  symbol: string,
  apiKey: string
): Promise<FinnhubCompanyProfile | null> {
  if (!apiKey.trim()) return null
  const url = new URL(PROFILE2_BASE)
  url.searchParams.set('symbol', symbol.toUpperCase())
  url.searchParams.set('token', apiKey)

  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Cache-Control': 'no-store' } })
  if (!res.ok) return null
  const data = (await res.json()) as FinnhubCompanyProfile2Response
  const sector = data?.sector ?? data?.finnhubIndustry ?? 'Unknown'
  return { symbol: symbol.toUpperCase(), sector }
}
