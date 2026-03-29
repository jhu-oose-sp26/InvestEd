import type { SupabaseClient } from '@supabase/supabase-js'
import type { MarketCandleRow } from './types'

const BATCH = 500

/**
 * Idempotent upsert on (symbol, bucket_start, timeframe, source).
 */
export async function upsertMarketCandles(
  client: SupabaseClient,
  rows: MarketCandleRow[],
): Promise<{ upserted: number; error?: string }> {
  if (rows.length === 0) return { upserted: 0 }
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await client.from('market_candles').upsert(batch, {
      onConflict: 'symbol,bucket_start,timeframe,source',
    })
    if (error) {
      return { upserted, error: error.message }
    }
    upserted += batch.length
  }
  return { upserted }
}
