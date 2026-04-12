/**
 * Live quote service: WebSocket cache + rare REST (seed previous close + cold start).
 * Change / % are derived from last trade price vs cached previous close so polls do not hit GET /quote.
 */

import { fetchFinnhubQuote } from './finnhubRestClient'
import { ensureSubscribed, ensureWatchlistSubscribed, getCachedQuote } from './finnhubWebSocketClient'
import {
  enrichQuoteWithDerivedChange,
  getPreviousClose,
} from './referenceCloseCache'
import type { FinnhubLiveQuote } from './types'

const REST_RETRY_DELAY_MS = 280
/** After subscribe, wait briefly for a trade so we can skip REST when the stream is active. */
const WS_WARM_MAX_MS = 180
const WS_WARM_TICK_MS = 36
/** One shared wait for `getLiveQuotes` so we do not run N parallel warm loops. */
/** Give WS trades a moment after batch subscribe before falling through to REST for many symbols. */
const WS_BATCH_WARM_MAX_MS = 650

async function waitForWsCache(symbol: string): Promise<void> {
  const sym = symbol.toUpperCase()
  const t0 = Date.now()
  while (Date.now() - t0 < WS_WARM_MAX_MS) {
    if (getCachedQuote(sym)) return
    await new Promise((r) => setTimeout(r, WS_WARM_TICK_MS))
  }
}

/** Wait once for WS trades after batch subscribe (same wall time as parallel per-symbol warm, less timer churn). */
function withRetrievedAt(q: FinnhubLiveQuote): FinnhubLiveQuote {
  return { ...q, retrievedAtMs: Date.now() }
}

async function waitForBatchWsCache(symbols: string[]): Promise<void> {
  const upper = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)
  if (!upper.length) return
  const t0 = Date.now()
  while (Date.now() - t0 < WS_BATCH_WARM_MAX_MS) {
    if (upper.every((s) => getCachedQuote(s))) return
    await new Promise((r) => setTimeout(r, WS_WARM_TICK_MS))
  }
}

export type GetLiveQuoteOptions = {
  /** When false, caller already warmed WS (e.g. `getLiveQuotes`). Default true. */
  warmWs?: boolean
}

/** One in-flight GET /quote per symbol so parallel getLiveQuotes does not duplicate calls. */
const previousCloseInflight = new Map<string, Promise<FinnhubLiveQuote | null>>()

/**
 * When previous close is unknown, fetch one /quote (records `pc` + returns full quote).
 * Returns null if `pc` already cached or fetch failed (non–rate-limit).
 */
async function fetchQuoteSeedingPc(symbol: string, apiKey: string): Promise<FinnhubLiveQuote | null> {
  if (getPreviousClose(symbol) != null) return null
  let p = previousCloseInflight.get(symbol)
  if (!p) {
    p = (async () => {
      try {
        return await fetchFinnhubQuote(symbol, apiKey)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.toLowerCase().includes('rate limit')) throw e
        return null
      } finally {
        previousCloseInflight.delete(symbol)
      }
    })()
    previousCloseInflight.set(symbol, p)
  }
  return await p
}

export async function getLiveQuote(
  symbol: string,
  apiKey: string | undefined,
  _staleMs?: number,
  options?: GetLiveQuoteOptions
): Promise<FinnhubLiveQuote | null> {
  const sym = symbol?.trim().toUpperCase()
  if (!sym || !apiKey?.trim()) return null
  const warmWs = options?.warmWs !== false
  ensureWatchlistSubscribed(apiKey)
  ensureSubscribed(sym, apiKey)

  let cached = getCachedQuote(sym)
  if (warmWs && !cached) {
    await waitForWsCache(sym)
    cached = getCachedQuote(sym)
  }
  if (cached) {
    if (getPreviousClose(sym) == null) {
      try {
        await fetchQuoteSeedingPc(sym, apiKey)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.toLowerCase().includes('rate limit')) {
          return withRetrievedAt({ ...cached })
        }
        throw e
      }
    }
    return withRetrievedAt(enrichQuoteWithDerivedChange(cached))
  }

  try {
    const seeded = await fetchQuoteSeedingPc(sym, apiKey)
    if (seeded) return withRetrievedAt(enrichQuoteWithDerivedChange(seeded))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes('rate limit')) throw e
  }

  const tryRest = async (): Promise<FinnhubLiveQuote | null> => {
    try {
      const q = await fetchFinnhubQuote(sym, apiKey!)
      return enrichQuoteWithDerivedChange(q)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('rate limit')) throw e
      return null
    }
  }
  const first = await tryRest()
  if (first) return withRetrievedAt(first)
  await new Promise((r) => setTimeout(r, REST_RETRY_DELAY_MS))
  const second = await tryRest()
  if (second) return withRetrievedAt(second)
  return null
}

/** Fetch quotes for multiple symbols (e.g. for portfolio graphs). Uses same cache + rare REST per symbol. */
export async function getLiveQuotes(
  symbols: string[],
  apiKey: string | undefined,
  staleMs?: number
): Promise<FinnhubLiveQuote[]> {
  if (!apiKey?.trim() || !symbols.length) return []
  ensureWatchlistSubscribed(apiKey)
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  for (const sym of unique) {
    ensureSubscribed(sym, apiKey)
  }
  await waitForBatchWsCache(unique)
  const settled = await Promise.allSettled(
    unique.map((sym) => getLiveQuote(sym, apiKey, staleMs, { warmWs: false })),
  )
  const out: FinnhubLiveQuote[] = []
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value != null) out.push(s.value)
  }
  return out
}
