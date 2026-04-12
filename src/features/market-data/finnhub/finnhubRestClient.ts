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
import { recordPreviousClose } from './referenceCloseCache'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

/** Parallel cap for GET /quote. Watchlist has 25 symbols*/
const QUOTE_FETCH_CONCURRENCY = 5
let activeQuoteFetches = 0
const quoteSlotWaiters: Array<() => void> = []

function acquireQuoteFetchSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (activeQuoteFetches < QUOTE_FETCH_CONCURRENCY) {
      activeQuoteFetches++
      resolve()
    } else {
      quoteSlotWaiters.push(() => {
        activeQuoteFetches++
        resolve()
      })
    }
  })
}

function releaseQuoteFetchSlot(): void {
  activeQuoteFetches--
  const wake = quoteSlotWaiters.shift()
  if (wake) wake()
}

async function runQuoteFetch<T>(work: () => Promise<T>): Promise<T> {
  await acquireQuoteFetchSlot()
  try {
    return await work()
  } finally {
    releaseQuoteFetchSlot()
  }
}

export async function fetchFinnhubQuote(symbol: string, apiKey: string): Promise<FinnhubLiveQuote> {
  return runQuoteFetch(() => fetchFinnhubQuoteImpl(symbol, apiKey))
}

async function fetchFinnhubQuoteImpl(symbol: string, apiKey: string): Promise<FinnhubLiveQuote> {
  if (!apiKey.trim()) throw new Error('Market data key is required')
  const url = new URL(`${FINNHUB_BASE}/quote`)
  url.searchParams.set('symbol', symbol.toUpperCase())
  url.searchParams.set('token', apiKey)

  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Cache-Control': 'no-store' } })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded')
    throw new Error(`Quote request failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as FinnhubQuoteResponse & { error?: string }
  if (typeof data?.error === 'string' && data.error.trim() !== '') {
    const low = data.error.toLowerCase()
    if (low.includes('limit') || low.includes('rate')) throw new Error('Rate limit exceeded')
    throw new Error(data.error)
  }
  const price = data?.c
  if (typeof price !== 'number') {
    throw new Error('Quote missing current price (market may be closed or symbol invalid)')
  }
  const sym = symbol.toUpperCase()
  recordPreviousClose(sym, data.pc)
  return {
    symbol: sym,
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
  return runQuoteFetch(() => fetchFinnhubQuoteSnapshotImpl(symbol, apiKey))
}

async function fetchFinnhubQuoteSnapshotImpl(
  symbol: string,
  apiKey: string,
): Promise<FinnhubQuoteSnapshot> {
  if (!apiKey.trim()) throw new Error('Market data key is required')
  const url = new URL(`${FINNHUB_BASE}/quote`)
  url.searchParams.set('symbol', symbol.toUpperCase())
  url.searchParams.set('token', apiKey)

  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Cache-Control': 'no-store' } })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded')
    throw new Error(`Quote request failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as FinnhubQuoteResponse & { error?: string }
  if (typeof data?.error === 'string' && data.error.trim() !== '') {
    const low = data.error.toLowerCase()
    if (low.includes('limit') || low.includes('rate')) throw new Error('Rate limit exceeded')
    throw new Error(data.error)
  }
  const price = data?.c
  if (typeof price !== 'number') {
    throw new Error('Quote missing current price (market may be closed or symbol invalid)')
  }
  recordPreviousClose(symbol.toUpperCase(), data.pc)
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
