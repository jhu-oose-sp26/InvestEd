/**
 * GET /api/candles?symbol=AAPL&start=...&end=...&timeframe=1Min&source=alpaca
 *
 * Alpaca-normalized 1m OHLCV from `market_candles` (~15m delayed bars vs Finnhub in product terms).
 * Finnhub real-time quotes live in `market_quote_snapshots` — see GET /api/quote-snapshots.
 * Combined candlestick math is not implemented; load both feeds and merge client-side or in a future job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured, getSupabaseServiceClient } from '@candle-supabase-pipeline'

const querySchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  start: z.string().min(1),
  end: z.string().min(1),
  timeframe: z.string().min(1).default('1Min'),
  source: z.enum(['alpaca', 'finnhub', 's3_yfinance', 'all']).default('alpaca'),
})

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase is not configured',
          hint: 'Set HOST (Supabase project URL, https://…supabase.co) and POSTGRES_PASSWORD (service_role key), apply supabase/migrations, then run npm run candles:sync',
        },
        { status: 503 },
      )
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = querySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { symbol, start, end, timeframe, source } = parsed.data
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start or end. Use ISO 8601 timestamps.' },
        { status: 400 },
      )
    }
    if (startDate >= endDate) {
      return NextResponse.json({ error: 'start must be before end' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    let q = supabase
      .from('market_candles')
      .select(
        'bucket_start,timeframe,open,high,low,close,volume,vwap,trade_count,source',
      )
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .gte('bucket_start', startDate.toISOString())
      .lte('bucket_start', endDate.toISOString())
      .order('bucket_start', { ascending: true })
      .limit(50_000)

    if (source !== 'all') {
      q = q.eq('source', source)
    }

    const { data: rows, error } = await q
    if (error) {
      console.error('Supabase candles query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type CandleDbRow = {
      bucket_start: string
      timeframe: string
      open: string | number
      high: string | number
      low: string | number
      close: string | number
      volume: string | number | null
      vwap: string | number | null
      trade_count: number | null
      source: string
    }

    const bars = (rows ?? []).map((r: CandleDbRow) => ({
      t: r.bucket_start,
      o: Number(r.open),
      h: Number(r.high),
      l: Number(r.low),
      c: Number(r.close),
      v: r.volume != null ? Number(r.volume) : null,
      vw: r.vwap != null ? Number(r.vwap) : null,
      n: r.trade_count,
      source: r.source,
      timeframe: r.timeframe,
    }))

    return NextResponse.json({
      symbol,
      timeframe,
      source: source === 'all' ? 'all' : source,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      count: bars.length,
      bars,
    })
  } catch (error) {
    console.error('Candles API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
