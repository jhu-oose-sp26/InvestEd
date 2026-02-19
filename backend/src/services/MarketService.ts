/**
 * Market Data Service
 * 
 * Abstracted market data provider that supports multiple APIs (Finnhub/Alpaca)
 * Implements strategy pattern for easy switching between providers
 * 
 * TODO: Implement provider-specific adapters
 * TODO: Add caching to reduce API calls
 * TODO: Implement rate limiting
 * TODO: Add data staleness validation (prices must not be older than 60 seconds)
 */

export interface MarketDataProvider {
  fetchCurrentPrice(ticker: string): Promise<number>
  subscribeToPriceTicks(ticker: string, callback: (price: number) => void): () => void
}

export interface MarketPrice {
  ticker: string
  price: number
  timestamp: Date
}

export class MarketService {
  private provider: MarketDataProvider
  private priceCache: Map<string, MarketPrice> = new Map()
  private subscriptions: Map<string, Set<(price: number) => void>> = new Map()

  constructor(provider: MarketDataProvider) {
    this.provider = provider
  }

  /**
   * Fetch current price for a ticker
   * TODO: Implement with caching and staleness check
   * - Check cache first
   * - Validate data is not older than 60 seconds
   * - Fetch from provider if cache is stale or missing
   */
  async fetchCurrentPrice(ticker: string): Promise<number> {
    // TODO: Check cache first
    // TODO: Validate timestamp (max 60 seconds old)
    // TODO: Fetch from provider if needed
    // TODO: Update cache
    return this.provider.fetchCurrentPrice(ticker)
  }

  /**
   * Subscribe to real-time price updates for a ticker
   * TODO: Implement WebSocket subscription management
   * - Create subscription if it doesn't exist
   * - Add callback to subscription set
   * - Return unsubscribe function
   */
  subscribeToPriceTicks(
    ticker: string,
    callback: (price: number) => void
  ): () => void {
    // TODO: Initialize subscription if needed
    // TODO: Add callback to subscription set
    // TODO: Return cleanup function
    return this.provider.subscribeToPriceTicks(ticker, callback)
  }

  /**
   * Get cached price if available and fresh
   * TODO: Implement staleness check (60 seconds max)
   */
  getCachedPrice(ticker: string): MarketPrice | null {
    const cached = this.priceCache.get(ticker)
    if (!cached) return null

    // TODO: Check if price is stale (older than 60 seconds)
    const age = Date.now() - cached.timestamp.getTime()
    if (age > 60000) return null // Stale

    return cached
  }
}

/**
 * Finnhub Provider Implementation
 * TODO: Implement Finnhub API integration
 * - Set up API client with authentication
 * - Implement REST endpoint for current price
 * - Implement WebSocket for real-time updates
 */
export class FinnhubProvider implements MarketDataProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchCurrentPrice(ticker: string): Promise<number> {
    // TODO: Call Finnhub API: https://finnhub.io/api/v1/quote?symbol={ticker}
    throw new Error('Finnhub provider not implemented')
  }

  subscribeToPriceTicks(ticker: string, callback: (price: number) => void): () => void {
    // TODO: Connect to Finnhub WebSocket: wss://ws.finnhub.io?token={apiKey}
    // TODO: Subscribe to ticker
    // TODO: Handle price updates
    throw new Error('Finnhub WebSocket not implemented')
  }
}

/**
 * Alpaca Provider Implementation
 * TODO: Implement Alpaca API integration
 * - Set up API client with authentication
 * - Implement REST endpoint for current price
 * - Implement WebSocket for real-time updates
 */
export class AlpacaProvider implements MarketDataProvider {
  private apiKey: string
  private apiSecret: string

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  async fetchCurrentPrice(ticker: string): Promise<number> {
    // TODO: Call Alpaca API: GET /v2/stocks/{ticker}/quotes/latest
    throw new Error('Alpaca provider not implemented')
  }

  subscribeToPriceTicks(ticker: string, callback: (price: number) => void): () => void {
    // TODO: Connect to Alpaca WebSocket: wss://stream.data.alpaca.markets/v2/iex
    // TODO: Subscribe to ticker
    // TODO: Handle price updates
    throw new Error('Alpaca WebSocket not implemented')
  }
}

