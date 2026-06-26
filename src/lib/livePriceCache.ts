"use client"
/**
 * Shared in-memory price cache written by the LiveMarketsStrip (SSE stream)
 * and read by useLivePrice so that:
 *  1. Symbols already streaming in the strip show a price instantly on the trade page.
 *  2. When /api/live-quote is rate-limited, the strip's cached price is used as a fallback.
 */

interface StripPriceEntry {
  price: number
  ts: number | null
}

const cache = new Map<string, StripPriceEntry>()

/** Called by the streaming client whenever a new quote arrives from the strip. */
export function setStripPrice(symbol: string, price: number, ts?: number | null): void {
  cache.set(symbol.trim().toUpperCase(), { price, ts: ts ?? null })
}

/** Read the latest strip price for a symbol (if it has been streamed). */
export function getStripPrice(symbol: string): StripPriceEntry | null {
  return cache.get(symbol.trim().toUpperCase()) ?? null
}
