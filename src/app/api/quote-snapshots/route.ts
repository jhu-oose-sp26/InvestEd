/**
 * GET /api/quote-snapshots?symbol=AAPL&start=...&end=...
 *
 * Finnhub /quote rows persisted in Supabase (real-time side). Use with /api/candles (Alpaca bars)
 * for future combined candlestick logic — not merged here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient, isSupabaseConfigured } from '@candle-supabase-pipeline'

const querySchema = z.object({
  symbol: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  start: z.string().min(1),
  end: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase is not configured',
          hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and apply supabase/migrations',
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

    const { symbol, start, end } = parsed.data
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
    const { data: rows, error } = await supabase
      .from('market_quote_snapshots')
      .select(
        'observed_at,last_price,day_open,day_high,day_low,prev_close,change_abs,change_pct,source',
      )
      .eq('symbol', symbol)
      .gte('observed_at', startDate.toISOString())
      .lte('observed_at', endDate.toISOString())
      .order('observed_at', { ascending: true })
      .limit(50_000)

    if (error) {
      console.error('Supabase quote-snapshots query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type QuoteDbRow = {
      observed_at: string
      last_price: string | number
      day_open: string | number | null
      day_high: string | number | null
      day_low: string | number | null
      prev_close: string | number | null
      change_abs: string | number | null
      change_pct: string | number | null
      source: string
    }

    const snapshots = (rows ?? []).map((r: QuoteDbRow) => ({
      t: r.observed_at,
      c: Number(r.last_price),
      o: r.day_open != null ? Number(r.day_open) : null,
      h: r.day_high != null ? Number(r.day_high) : null,
      l: r.day_low != null ? Number(r.day_low) : null,
      pc: r.prev_close != null ? Number(r.prev_close) : null,
      d: r.change_abs != null ? Number(r.change_abs) : null,
      dp: r.change_pct != null ? Number(r.change_pct) : null,
      source: r.source,
    }))

    return NextResponse.json({
      symbol,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      count: snapshots.length,
      snapshots,
    })
  } catch (error) {
    console.error('Quote snapshots API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
