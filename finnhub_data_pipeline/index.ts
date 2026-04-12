/**
 * Finnhub data pipeline – public API for the app and CLI pipelines.
 * Import from '@finnhub-data-pipeline'. Implementation lives under
 * `src/features/market-data/finnhub/`.
 */

export { getLiveQuote, getLiveQuotes } from '../src/features/market-data/finnhub/finnhubLiveQuoteService'
export {
  fetchFinnhubCompanyProfile,
  fetchFinnhubQuoteSnapshot,
} from '../src/features/market-data/finnhub/finnhubRestClient'
export type {
  FinnhubLiveQuote,
  FinnhubQuoteResponse,
  FinnhubQuoteSnapshot,
  FinnhubTradeItem,
  FinnhubTradeMessage,
  FinnhubCompanyProfile,
  FinnhubCompanyProfile2Response,
} from '../src/features/market-data/finnhub/types'
