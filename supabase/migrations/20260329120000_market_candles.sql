-- Canonical OHLCV candles for charting and analytics.
-- Unique per (symbol, bucket_start, timeframe, source) so Alpaca and Finnhub rows
-- for the same bucket can coexist; chart API picks a primary source or filters by source.
-- RLS: enabled with no policies — only the Supabase service role (server-side) can access.
-- Anon/authenticated clients use the Next.js API route, not direct table access.

CREATE TABLE IF NOT EXISTS public.market_candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  bucket_start timestamptz NOT NULL,
  timeframe text NOT NULL,
  open numeric(18, 6) NOT NULL,
  high numeric(18, 6) NOT NULL,
  low numeric(18, 6) NOT NULL,
  close numeric(18, 6) NOT NULL,
  volume bigint,
  vwap numeric(18, 6),
  trade_count integer,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_candles_source_check CHECK (
    source = ANY (ARRAY['alpaca'::text, 'finnhub'::text, 's3_yfinance'::text, 'merged'::text])
  ),
  CONSTRAINT market_candles_unique_vendor_bar UNIQUE (symbol, bucket_start, timeframe, source)
);

CREATE INDEX IF NOT EXISTS market_candles_symbol_tf_bucket_desc_idx
  ON public.market_candles (symbol, timeframe, bucket_start DESC);

CREATE INDEX IF NOT EXISTS market_candles_symbol_source_idx
  ON public.market_candles (symbol, source);

COMMENT ON TABLE public.market_candles IS 'Normalized OHLCV from Alpaca, Finnhub, S3/yfinance, or merged jobs.';

ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;
