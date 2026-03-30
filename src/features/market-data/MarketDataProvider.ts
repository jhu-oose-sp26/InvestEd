import { prisma } from '@/lib/prisma'
import type { Quote, MarketDataProvider } from '@/types'

// Re-export types for backward compatibility
export type { Quote, MarketDataProvider } from '@/types'

/**
 * Postgres-backed market data provider.
 * Uses the latest stored OHLCV row in `market_prices` for each symbol.
 * Quote requests currently map to the latest close.
 */
export class PostgresMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote> {
    const latestPrice = await prisma.marketPrice.findFirst({
      where: { symbol: symbol },
      orderBy: { timestamp: 'desc' },
      select: {
        symbol: true,
        close: true,
        timestamp: true,
      },
    })

    if (!latestPrice) {
      throw new Error(`No market price available for symbol: ${symbol}`)
    }

    return {
      symbol: latestPrice.symbol,
      price: latestPrice.close.toNumber(),
      timestamp: latestPrice.timestamp.getTime(),
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const latestBySymbol = await Promise.all(
      symbols.map((symbol) =>
        prisma.marketPrice.findFirst({
          where: { symbol },
          orderBy: { timestamp: 'desc' },
          select: {
            symbol: true,
            close: true,
            timestamp: true,
          },
        })
      )
    )

    return latestBySymbol
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .map((row) => ({
        symbol: row.symbol,
        price: row.close.toNumber(),
        timestamp: row.timestamp.getTime(),
      }))
  }
}

/**
 * Factory function for the single source of truth market data provider.
 */
export function createMarketDataProvider(): MarketDataProvider {
  return new PostgresMarketDataProvider()
}

// Export singleton instance (lazy initialization)
let marketDataProviderInstance: MarketDataProvider | null = null

export function getMarketDataProvider(): MarketDataProvider {
  if (!marketDataProviderInstance) {
    marketDataProviderInstance = createMarketDataProvider()
  }
  return marketDataProviderInstance
}
