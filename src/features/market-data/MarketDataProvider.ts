import axios, { AxiosInstance } from 'axios'
import type { Quote, MarketDataProvider } from '@/types'

// Re-export types for backward compatibility
export type { Quote, MarketDataProvider } from '@/types'

/**
 * MarketDataProvider abstract class that can be swapped for different providers
 * Currently implements Finnhub, but can be extended for Alpaca, Alpha Vantage, etc.
 */
export abstract class BaseMarketDataProvider implements MarketDataProvider {
  protected apiKey: string
  protected baseURL: string
  protected client: AxiosInstance

  constructor(apiKey: string, baseURL: string) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    })
  }

  abstract getQuote(symbol: string): Promise<Quote>
  abstract getQuotes(symbols: string[]): Promise<Quote[]>
}

/**
 * Finnhub Market Data Provider
 * Implements REST API integration with Finnhub for real-time and historical market data
 */
export class FinnhubProvider extends BaseMarketDataProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://finnhub.io/api/v1')
  }

  /**
   * Get real-time quote for a single symbol
   * @param symbol - Stock ticker symbol (e.g., "AAPL")
   */
  async getQuote(symbol: string): Promise<Quote> {
    try {
      const response = await this.client.get('/quote', {
        params: {
          symbol: symbol.toUpperCase(),
          token: this.apiKey,
        },
      })

      const data = response.data

      if (data.c === 0) {
        throw new Error(`No data available for symbol: ${symbol}`)
      }

      return {
        symbol: symbol.toUpperCase(),
        price: data.c, // Current price
        timestamp: data.t * 1000, // Convert Unix timestamp to milliseconds
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch quote for ${symbol}: ${error.response?.statusText ?? error.message}`
        )
      }
      throw error
    }
  }

  /**
   * Get real-time quotes for multiple symbols
   * Note: Finnhub free tier has rate limits, so we fetch sequentially
   * For production, consider batching or using WebSocket subscriptions
   */
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(
      symbols.map((symbol) => this.getQuote(symbol).catch((error) => {
        console.error(`Error fetching quote for ${symbol}:`, error)
        return null
      }))
    )

    return quotes.filter((quote): quote is Quote => quote !== null)
  }
}

/**
 * Factory function to create market data provider based on environment
 * Makes it easy to swap providers without changing business logic
 */
export function createMarketDataProvider(): MarketDataProvider {
  const apiKey = process.env.FINNHUB_API_KEY

  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY environment variable is not set')
  }

  return new FinnhubProvider(apiKey)
}

// Export singleton instance (lazy initialization)
let marketDataProviderInstance: MarketDataProvider | null = null

export function getMarketDataProvider(): MarketDataProvider {
  if (!marketDataProviderInstance) {
    marketDataProviderInstance = createMarketDataProvider()
  }
  return marketDataProviderInstance
}

