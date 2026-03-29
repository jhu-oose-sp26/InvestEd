import type { SupabaseClient } from '@supabase/supabase-js'
import type { MarketQuoteSnapshotRow } from './types'

const BATCH = 500

export async function upsertQuoteSnapshots(
  client: SupabaseClient,
  rows: MarketQuoteSnapshotRow[],
): Promise<{ upserted: number; error?: string }> {
  if (rows.length === 0) return { upserted: 0 }
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await client.from('market_quote_snapshots').upsert(batch, {
      onConflict: 'symbol,observed_at',
    })
    if (error) {
      return { upserted, error: error.message }
    }
    upserted += batch.length
  }
  return { upserted }
}
