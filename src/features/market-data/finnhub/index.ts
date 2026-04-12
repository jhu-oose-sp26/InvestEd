/**
 * Finnhub integration – public API for live quotes.
 * Import from `@/features/market-data/finnhub`.
 */

export { getLiveQuote, getLiveQuotes } from './finnhubLiveQuoteService'
export type { GetLiveQuoteOptions } from './finnhubLiveQuoteService'
export { fetchFinnhubCompanyNews, fetchFinnhubCompanyProfile } from './finnhubRestClient'
export { FINNHUB_WATCHLIST_SYMBOLS } from './watchlistSymbols'
export { getSubscribedSymbols } from './finnhubWebSocketClient'
export type { FinnhubLiveQuote, FinnhubQuoteResponse, FinnhubTradeItem, FinnhubTradeMessage } from './types'
