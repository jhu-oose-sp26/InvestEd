# Candle Supabase pipeline

Loads Alpaca bars and Finnhub `/quote` snapshots into Supabase via **`@supabase/supabase-js`**.

## Environment (names used in code)

The client reads **only**:

| Variable | Used for |
|----------|-----------|
| **`HOST`** | Supabase project URL (`https://….supabase.co` or hostname; `https://` added if missing) |
| **`POSTGRES_PASSWORD`** | Supabase **service_role** key (JWT from the dashboard) |

`DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_DB`, and `PORT` are **not** read by this package (they stay for Prisma / Docker Postgres elsewhere).

## Migrations

1. `../supabase/migrations/20260329120000_market_candles.sql`
2. `../supabase/migrations/20260329130000_market_quote_snapshots.sql`

## Sync

```bash
npm run candles:sync -- AAPL 2026-03-28T14:30:00Z 2026-03-28T20:00:00Z
```

## APIs

- `GET /api/candles`
- `GET /api/quote-snapshots`

```ts
import { syncCandlesToSupabase, isSupabaseConfigured } from '@candle-supabase-pipeline'
```
