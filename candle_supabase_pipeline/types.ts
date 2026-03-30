/**
 * Canonical rows for Supabase: Alpaca OHLCV bars + Finnhub quote snapshots.
 */

export type CandleSource = 'alpaca' | 'finnhub' | 's3_yfinance'

/** Row shape for public.market_candles (snake_case). */
export interface MarketCandleRow {
  symbol: string
  bucket_start: string
  timeframe: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  vwap: number | null
  trade_count: number | null
  source: CandleSource
}

/** Row shape for public.market_quote_snapshots (Finnhub GET /quote). */
export interface MarketQuoteSnapshotRow {
  symbol: string
  observed_at: string
  last_price: number
  day_open: number | null
  day_high: number | null
  day_low: number | null
  prev_close: number | null
  change_abs: number | null
  change_pct: number | null
  source: 'finnhub_quote'
}

export interface SyncCandlesResult {
  symbol: string
  start: string
  end: string
  alpacaRowsUpserted: number
  quoteSnapshotsUpserted: number
  errors: string[]
}
