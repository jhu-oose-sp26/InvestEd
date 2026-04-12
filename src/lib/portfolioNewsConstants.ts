/**
 * Max /company-news calls per refresh. Keep low: Finnhub REST quota is shared with
 * /quote, /stock/profile2, and other routes in this app (~30–60 calls/min on free tier).
 */
export const PORTFOLIO_NEWS_MAX_SYMBOLS = 5

/** How often the sidebar refetches (no server cache — rate limit is controlled here). */
export const PORTFOLIO_NEWS_CLIENT_POLL_MS = 30 * 60 * 1000
