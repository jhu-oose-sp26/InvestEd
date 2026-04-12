/**
 * In-memory previous close (Finnhub `pc`) per symbol.
 * Lets us derive change / % from WebSocket last trade without calling GET /quote on every poll.
 */

import type { FinnhubLiveQuote } from './types'

const TTL_MS = 24 * 60 * 60 * 1000

const store = new Map<string, { pc: number; at: number }>()

export function recordPreviousClose(symbol: string, pc: number | null | undefined): void {
  if (typeof pc !== 'number' || !Number.isFinite(pc) || pc <= 0) return
  store.set(symbol.toUpperCase(), { pc, at: Date.now() })
}

export function getPreviousClose(symbol: string): number | undefined {
  const sym = symbol.toUpperCase()
  const e = store.get(sym)
  if (!e) return undefined
  if (Date.now() - e.at > TTL_MS) {
    store.delete(sym)
    return undefined
  }
  return e.pc
}

/** Match Finnhub REST `d` / `dp`: move vs previous close, using current price (e.g. last WS trade). */
export function enrichQuoteWithDerivedChange(q: FinnhubLiveQuote): FinnhubLiveQuote {
  const pc = getPreviousClose(q.symbol)
  if (pc == null) return { ...q }
  const change = q.price - pc
  const percentChange = (change / pc) * 100
  return { ...q, change, percentChange }
}
