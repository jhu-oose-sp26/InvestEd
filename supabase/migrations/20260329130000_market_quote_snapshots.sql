-- Real-time Finnhub /quote observations normalized for Supabase (inputs to future candlestick math with Alpaca bars).
-- RLS: enabled, no policies — service role only (same pattern as market_candles).

CREATE TABLE IF NOT EXISTS public.market_quote_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  observed_at timestamptz NOT NULL,
  last_price numeric(18, 6) NOT NULL,
  day_open numeric(18, 6),
  day_high numeric(18, 6),
  day_low numeric(18, 6),
  prev_close numeric(18, 6),
  change_abs numeric(18, 6),
  change_pct numeric(18, 6),
  source text NOT NULL DEFAULT 'finnhub_quote',
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_quote_snapshots_source_check CHECK (source = 'finnhub_quote'),
  CONSTRAINT market_quote_snapshots_symbol_observed_unique UNIQUE (symbol, observed_at)
);

CREATE INDEX IF NOT EXISTS market_quote_snapshots_symbol_observed_desc_idx
  ON public.market_quote_snapshots (symbol, observed_at DESC);

ALTER TABLE public.market_quote_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.market_quote_snapshots IS 'Finnhub GET /quote snapshots (UTC). Pairs with market_candles (Alpaca) for combined candlestick logic later.';
