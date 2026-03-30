/**
 * Default symbols for the live strip and /markets page.
 * Single source: Finnhub watchlist in `src/features/market-data/finnhub/watchlistSymbols.ts`.
 */
/** Import this file only — not `finnhub/index.ts` — so client bundles never pull in `ws`. */
export { FINNHUB_WATCHLIST_SYMBOLS as DEFAULT_LIVE_MARKETS_SYMBOLS } from '@/features/market-data/finnhub/watchlistSymbols'
