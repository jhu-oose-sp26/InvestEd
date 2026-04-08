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

const REST_RETRY_DELAY_MS = 400

/** One in-flight seed per symbol so parallel getLiveQuotes does not duplicate /quote calls. */
const previousCloseInflight = new Map<string, Promise<void>>()

async function ensurePreviousCloseSeeded(symbol: string, apiKey: string): Promise<void> {
  if (getPreviousClose(symbol) != null) return
  let p = previousCloseInflight.get(symbol)
  if (!p) {
    p = (async () => {
      try {
        await fetchFinnhubQuote(symbol, apiKey)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('rate limit')) throw e
      } finally {
        previousCloseInflight.delete(symbol)
      }
    })()
    previousCloseInflight.set(symbol, p)
  }
  await p
}

export async function getLiveQuote(
  symbol: string,
  apiKey: string | undefined,
  _staleMs?: number
): Promise<FinnhubLiveQuote | null> {
  const sym = symbol?.trim().toUpperCase()
  if (!sym || !apiKey?.trim()) return null
  ensureWatchlistSubscribed(apiKey)
  ensureSubscribed(sym, apiKey)

  try {
    await ensurePreviousCloseSeeded(sym, apiKey)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('rate limit')) throw e
  }

  const cached = getCachedQuote(sym)
  if (cached) {
    return enrichQuoteWithDerivedChange(cached)
  }

  const tryRest = async (): Promise<FinnhubLiveQuote | null> => {
    try {
      const q = await fetchFinnhubQuote(sym, apiKey!)
      return enrichQuoteWithDerivedChange(q)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('rate limit')) throw e
      return null
    }
  }
  const first = await tryRest()
  if (first) return first
  await new Promise((r) => setTimeout(r, REST_RETRY_DELAY_MS))
  const second = await tryRest()
  if (second) return second
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
  const results = await Promise.all(unique.map((sym) => getLiveQuote(sym, apiKey, staleMs)))
  return results.filter((q): q is FinnhubLiveQuote => q != null)
}
