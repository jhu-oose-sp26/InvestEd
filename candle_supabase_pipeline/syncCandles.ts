import { fetchBarsFromAlpaca } from '@alpaca-data-pipeline/alpacaBarsApi'
import { fetchFinnhubQuoteSnapshot } from '@/features/market-data/finnhub'
import { alpacaBarsToRows, finnhubQuoteSnapshotToRow } from './normalize'
import { getSupabaseServiceClient } from './supabaseAdmin'
import type { SyncCandlesResult } from './types'
import { upsertMarketCandles } from './upsertCandles'
import { upsertQuoteSnapshots } from './upsertQuoteSnapshots'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

function clampHistoryEnd(end: Date): Date {
  const cutoff = new Date(Date.now() - FIFTEEN_MINUTES_MS)
  return end > cutoff ? cutoff : end
}

export interface SyncCandlesOptions {
  symbol: string
  start: Date
  end: Date
  /** Default true. Alpaca 1Min bars → market_candles (source alpaca). ~15m delayed vs Finnhub in product terms. */
  includeAlpaca?: boolean
  /** Default true when FINNHUB_API_KEY is set. One GET /quote snapshot → market_quote_snapshots (real-time side). */
  includeFinnhubQuote?: boolean
}

/**
 * Normalize and load to Supabase: Alpaca OHLCV bars + Finnhub quote snapshot.
 * Bar range end is clamped to now − 15m (unfinished bars). Quote is fetched once per sync regardless of range.
 */
export async function syncCandlesToSupabase(options: SyncCandlesOptions): Promise<SyncCandlesResult> {
  const {
    symbol,
    start,
    end,
    includeAlpaca = true,
    includeFinnhubQuote = true,
  } = options

  const errors: string[] = []
  let alpacaRowsUpserted = 0
  let quoteSnapshotsUpserted = 0

  const clampedEnd = clampHistoryEnd(end)
  const client = getSupabaseServiceClient()

  if (includeAlpaca && start < clampedEnd) {
    try {
      const bars = await fetchBarsFromAlpaca(symbol, start, clampedEnd)
      const rows = alpacaBarsToRows(symbol, bars, 'alpaca')
      const { upserted, error } = await upsertMarketCandles(client, rows)
      if (error) errors.push(`Alpaca upsert: ${error}`)
      else alpacaRowsUpserted = upserted
    } catch (e) {
      errors.push(`Alpaca: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (includeFinnhubQuote) {
    const apiKey = process.env.FINNHUB_API_KEY?.trim()
    if (!apiKey) {
      errors.push('Finnhub quote: FINNHUB_API_KEY not set')
    } else {
      try {
        const snap = await fetchFinnhubQuoteSnapshot(symbol, apiKey)
        const row = finnhubQuoteSnapshotToRow(snap)
        const { upserted, error } = await upsertQuoteSnapshots(client, [row])
        if (error) errors.push(`Finnhub quote upsert: ${error}`)
        else quoteSnapshotsUpserted = upserted
      } catch (e) {
        errors.push(`Finnhub quote: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return {
    symbol: symbol.trim().toUpperCase(),
    start: start.toISOString(),
    end: clampedEnd.toISOString(),
    alpacaRowsUpserted,
    quoteSnapshotsUpserted,
    errors,
  }
}
