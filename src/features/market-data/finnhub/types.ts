/**
 * Finnhub API types for real-time and quote data.
 * Public types used by the app, API routes, hooks, and future graphs/UI.
 * @see https://finnhub.io/docs/api
 */

// --- REST Quote API (GET /quote?symbol=AAPL) ---
export interface FinnhubQuoteResponse {
  c: number   // current price
  d: number   // change
  dp: number  // percent change
  h: number   // high of day
  l: number   // low of day
  o: number   // open
  pc: number  // previous close
  t: number   // timestamp (UNIX seconds)
}

// --- WebSocket trade stream ---
export interface FinnhubTradeItem {
  s: string   // symbol
  p: number   // price
  t: number   // timestamp (ms)
  v: number   // volume
  c?: string[]
}

export interface FinnhubTradeMessage {
  type: 'trade'
  data: FinnhubTradeItem[]
}

/** Normalized live quote: use this in UI, graphs, and API responses */
export interface FinnhubLiveQuote {
  symbol: string
  price: number
  timestamp: number
  volume?: number
  /** Change from previous close (from REST; not in WS trade stream) */
  change?: number
  /** Percent change from previous close (from REST) */
  percentChange?: number
}

/** Full /quote payload normalized for persistence (Supabase pipeline). */
export interface FinnhubQuoteSnapshot {
  symbol: string
  /** ISO 8601 UTC */
  observedAtIso: string
  lastPrice: number
  dayOpen: number | null
  dayHigh: number | null
  dayLow: number | null
  prevClose: number | null
  changeAbs: number | null
  changePct: number | null
}

// --- Company Profile (GET /stock/profile2) - for sector/industry ---
export interface FinnhubCompanyProfile2Response {
  name?: string
  country?: string
  currency?: string
  exchange?: string
  finnhubIndustry?: string
  ipo?: string
  marketCapitalization?: number
  shareOutstanding?: number
  logo?: string
  phone?: string
  weburl?: string
  sector?: string
}

export interface FinnhubCompanyProfile {
  symbol: string
  sector: string
}
