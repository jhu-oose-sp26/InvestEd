/**
 * Live quote service: WebSocket cache + REST fallback.
 * Single source for real-time quotes used by API, hooks, and future graphs/UI.
 */

import { fetchFinnhubQuote } from './finnhubRestClient'
import { ensureSubscribed, ensureWatchlistSubscribed, getCachedQuote } from './finnhubWebSocketClient'
import type { FinnhubLiveQuote } from './types'

const DEFAULT_STALE_MS = 60_000
const REST_RETRY_DELAY_MS = 400

export async function getLiveQuote(
  symbol: string,
  apiKey: string | undefined,
  staleMs: number = DEFAULT_STALE_MS
): Promise<FinnhubLiveQuote | null> {
  const sym = symbol?.trim().toUpperCase()
  if (!sym || !apiKey?.trim()) return null
  ensureWatchlistSubscribed(apiKey)
  ensureSubscribed(sym, apiKey)
  const cached = getCachedQuote(sym)
  if (cached && Date.now() - cached.timestamp < staleMs) return cached
  const tryRest = async (): Promise<FinnhubLiveQuote | null> => {
    try {
      return await fetchFinnhubQuote(sym, apiKey!)
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
  return cached ?? null
}

/** Fetch quotes for multiple symbols (e.g. for portfolio graphs). Uses same cache + REST fallback per symbol. */
export async function getLiveQuotes(
  symbols: string[],
  apiKey: string | undefined,
  staleMs: number = DEFAULT_STALE_MS
): Promise<FinnhubLiveQuote[]> {
  if (!apiKey?.trim() || !symbols.length) return []
  ensureWatchlistSubscribed(apiKey)
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  const results = await Promise.all(unique.map((sym) => getLiveQuote(sym, apiKey, staleMs)))
  return results.filter((q): q is FinnhubLiveQuote => q != null)
}
