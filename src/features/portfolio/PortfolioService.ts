import { prisma } from '@/lib/prisma'
import { getMarketDataProvider } from '../market-data/MarketDataProvider'
import type { PositionValue, PortfolioSummary } from '@/types'
import { computePositionValuesFromPriceMap } from './portfolioValuation'

// Re-export types for backward compatibility
export type { PositionValue, PortfolioSummary } from '@/types'

/**
 * PortfolioService handles portfolio valuation and P&L calculations
 */
export class PortfolioService {
  /**
   * Calculates current portfolio value and P&L for a portfolio
   * Fetches current market prices and compares against cost basis
   */
  async getPortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
    // Get portfolio cash balance
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, name: true, cashBalance: true },
    })

    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    // Get all positions
    const positions = await prisma.position.findMany({
      where: { portfolioId },
    })

    if (positions.length === 0) {
      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        totalCash: portfolio.cashBalance.toNumber(),
        totalInvested: 0,
        totalCurrentValue: 0,
        totalPortfolioValue: portfolio.cashBalance.toNumber(),
        totalUnrealizedPnL: 0,
        totalUnrealizedPnLPercent: 0,
        positions: [],
      }
    }

    // Fetch current prices for all symbols
    const symbols = positions.map((p: { symbol: string }) => p.symbol)
    const marketDataProvider = getMarketDataProvider()
    const quotes = await marketDataProvider.getQuotes(symbols)

    // Create a map for quick lookup
    const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]))

    const positionValues: PositionValue[] = computePositionValuesFromPriceMap(positions, priceMap)

    // Calculate totals
    const totalCash = portfolio.cashBalance.toNumber()
    const totalInvested = positionValues.reduce((sum, p) => sum + p.totalCost, 0)
    const totalCurrentValue = positionValues.reduce((sum, p) => sum + p.currentValue, 0)
    const totalPortfolioValue = totalCash + totalCurrentValue
    const totalUnrealizedPnL = totalCurrentValue - totalInvested
    const totalUnrealizedPnLPercent =
      totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0

    return {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      totalCash,
      totalInvested,
      totalCurrentValue,
      totalPortfolioValue,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent,
      positions: positionValues,
    }
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService()
