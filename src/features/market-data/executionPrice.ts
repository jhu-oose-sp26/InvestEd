/**
 * Trade execution price: uses Finnhub live data (WebSocket cache + REST fallback,
 * same path as /api/live-quote). Subscribes the symbol and watchlist via getLiveQuote.
 * Falls back to Postgres market_prices when no API key or no usable quote.
 */

import { getLiveQuote } from '@/features/market-data/finnhub'
import { getMarketDataProvider } from './MarketDataProvider'

/** Tighter than default strip polling so fills track recent ticks / quote when possible */
const EXECUTION_STALE_MS = 30_000

export type ExecutionPriceSource = 'finnhub' | 'postgres'

export async function resolveTradeExecutionPrice(
  symbol: string
): Promise<{ price: number; source: ExecutionPriceSource }> {
  const sym = symbol.trim().toUpperCase()
  if (!sym) throw new Error('Symbol is required')

  const apiKey = process.env.FINNHUB_API_KEY
  if (apiKey?.trim()) {
    const live = await getLiveQuote(sym, apiKey, EXECUTION_STALE_MS)
    if (live != null && Number.isFinite(live.price) && live.price > 0) {
      return { price: live.price, source: 'finnhub' }
    }
  }

  const quote = await getMarketDataProvider().getQuote(sym)
  if (!Number.isFinite(quote.price) || quote.price <= 0) {
    throw new Error(`Invalid market price for symbol: ${sym}`)
  }
  return { price: quote.price, source: 'postgres' }
}
