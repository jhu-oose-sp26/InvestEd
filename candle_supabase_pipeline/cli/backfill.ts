/**
 * One-time backfill from local Postgres (Prisma) into Supabase market_candles.
 *
 * - market_prices_realtime → source alpaca, preserves timeframe from DB (usually 1Min)
 * - market_prices (S3/yfinance daily) → source s3_yfinance, timeframe 1D
 *
 * Usage:
 *   npm run candles:backfill
 *   npm run candles:backfill -- --realtime-only
 *   npm run candles:backfill -- --daily-only
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import type { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { getSupabaseServiceClient } from '../supabaseAdmin'
import type { MarketCandleRow } from '../types'
import { upsertMarketCandles } from '../upsertCandles'

config({ path: resolve(process.cwd(), '.env') })

interface RealtimePriceRow {
  symbol: string
  timestamp: Date
  timeframe: string
  open: Decimal
  high: Decimal
  low: Decimal
  close: Decimal
  volume: bigint | null
  vwap: Decimal | null
  tradeCount: number | null
}

async function backfillRealtime(): Promise<{ rows: number; error?: string }> {
  const rows = (await prisma.marketPrice.findMany({
    orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
  })) as RealtimePriceRow[]
  const mapped: MarketCandleRow[] = rows.map((r) => ({
    symbol: r.symbol,
    bucket_start: r.timestamp.toISOString(),
    timeframe: r.timeframe,
    open: r.open.toNumber(),
    high: r.high.toNumber(),
    low: r.low.toNumber(),
    close: r.close.toNumber(),
    volume: r.volume != null ? Number(r.volume) : null,
    vwap: r.vwap?.toNumber() ?? null,
    trade_count: r.tradeCount ?? null,
    source: 'alpaca',
  }))
  const client = getSupabaseServiceClient()
  return upsertMarketCandles(client, mapped).then((r) => ({
    rows: r.upserted,
    error: r.error,
  }))
}

async function backfillDailyS3(): Promise<{ rows: number; error?: string; skipped?: string }> {
  try {
    const raw = (await prisma.$queryRawUnsafe(`
      SELECT symbol, as_of_date, open, high, low, close, volume::bigint AS volume
      FROM market_prices
      ORDER BY symbol, as_of_date
    `)) as Array<{
      symbol: string
      as_of_date: Date
      open: Decimal
      high: Decimal
      low: Decimal
      close: Decimal
      volume: number | null
    }>
    const mapped: MarketCandleRow[] = raw.map((r) => {
      const d = r.as_of_date
      const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
      return {
        symbol: r.symbol.trim().toUpperCase(),
        bucket_start: utc.toISOString(),
        timeframe: '1D',
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: r.volume != null ? Math.trunc(Number(r.volume)) : null,
        vwap: null,
        trade_count: null,
        source: 's3_yfinance',
      }
    })
    const client = getSupabaseServiceClient()
    return upsertMarketCandles(client, mapped).then((r) => ({
      rows: r.upserted,
      error: r.error,
    }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('market_prices') || msg.includes('does not exist')) {
      return { rows: 0, skipped: 'Table market_prices not present or empty' }
    }
    return { rows: 0, error: msg }
  }
}

function parseFlags(argv: string[]) {
  let realtime = true
  let daily = true
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--realtime-only') {
      daily = false
    }
    if (argv[i] === '--daily-only') {
      realtime = false
    }
  }
  return { realtime, daily }
}

async function main() {
  const { realtime, daily } = parseFlags(process.argv)
  const summary: Record<string, unknown> = {}

  if (realtime) {
    console.error('Backfilling from market_prices_realtime (tagged source=alpaca)...')
    const r = await backfillRealtime()
    summary.realtime = r
    if (r.error) console.error('Realtime backfill error:', r.error)
    else console.error(`Upserted ${r.rows} rows`)
  }

  if (daily) {
    console.error('Backfilling from market_prices (source=s3_yfinance, timeframe=1D)...')
    const d = await backfillDailyS3()
    summary.daily = d
    if (d.skipped) console.error('Daily:', d.skipped)
    else if (d.error) console.error('Daily backfill error:', d.error)
    else console.error(`Upserted ${d.rows} rows`)
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
