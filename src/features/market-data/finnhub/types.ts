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
  /** UNIX seconds — often last trade/quote time; after the US close many symbols share the regular session end. */
  t: number
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

/** Server keep-alive; client must reply with `{ type: 'pong' }` on the same socket. */
export type FinnhubWsControlMessage = { type: 'ping' } | { type: 'pong' }

/** Normalized live quote: use this in UI, graphs, and API responses */
export interface FinnhubLiveQuote {
  symbol: string
  price: number
  /**
   * Finnhub’s quote/trade time in ms (REST `t`×1000 or WS trade `t`).
   * After hours, REST `t` is often the same session-close instant for many US symbols (e.g. 4:00 PM Eastern).
   */
  timestamp: number
  volume?: number
  /** Finnhub trade time (ms) when `price` is from the last WebSocket trade; omitted when price is REST-only. */
  webSocketUpdatedAt?: number
  /** When our server assembled this quote for the API (ms). Prefer for “how fresh is this row” in the UI. */
  retrievedAtMs?: number
  /** Change vs previous close: from REST or derived from WS price + cached `pc` */
  change?: number
  /** Percent change vs previous close: from REST or derived from WS price + cached `pc` */
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
