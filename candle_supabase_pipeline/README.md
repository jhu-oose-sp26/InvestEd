# Candle Supabase pipeline

Loads **two normalized inputs** into Supabase for **future** combined candlestick logic:

1. **Alpaca** — 1-minute OHLCV bars → `public.market_candles` (`source = 'alpaca'`). Treated as **~15-minute-delayed** market data relative to Finnhub in product terms; bar fetch still **clamps end to now − 15 minutes** so unfinished bars are skipped (same as [`alpacaBarService`](../alpaca_data_pipeline/alpacaBarService.ts)).
2. **Finnhub** — one **`GET /quote`** snapshot per sync → `public.market_quote_snapshots` (**real-time** quote side). The **trading engine** continues to use Finnhub elsewhere (`getLiveQuote`, WebSocket); this table mirrors quote fields for analytics/charts.

There is **no** Finnhub **`/stock/candle`** path in this repo. **No** server-side merge of Alpaca + Finnhub into a single OHLC series yet.

## Schema (Supabase / Postgres)

Apply both migrations in order:

1. [`../supabase/migrations/20260329120000_market_candles.sql`](../supabase/migrations/20260329120000_market_candles.sql) — bars; unique `(symbol, bucket_start, timeframe, source)`.
2. [`../supabase/migrations/20260329130000_market_quote_snapshots.sql`](../supabase/migrations/20260329130000_market_quote_snapshots.sql) — quote snapshots; unique `(symbol, observed_at)`.

RLS enabled, no policies — **service role** only (used from Next.js API routes and CLI). Do not expose the service key to the browser.

## Environment

Root `.env` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `ALPAKA_API_KEY` / `ALPAKA_API_SECRET` | Alpaca 1Min bars |
| `FINNHUB_API_KEY` | Finnhub `/quote` on sync |

## Sync (ETL)

```bash
# Alpaca bars for range + one Finnhub quote snapshot (default)
npm run candles:sync -- AAPL 2026-03-10T14:30:00Z 2026-03-10T20:00:00Z

npm run candles:sync -- AAPL ... --alpaca-only
npm run candles:sync -- AAPL ... --quote-only
npm run candles:sync -- AAPL ... --no-quote
```

## Backfill from local Postgres

```bash
npm run candles:backfill
npm run candles:backfill -- --realtime-only
npm run candles:backfill -- --daily-only
```

## APIs

- **`GET /api/candles`** — Alpaca (and other bar `source` values) from `market_candles`.
- **`GET /api/quote-snapshots`** — Finnhub quote rows from `market_quote_snapshots`.

```ts
import { syncCandlesToSupabase, isSupabaseConfigured } from '@candle-supabase-pipeline'
```
