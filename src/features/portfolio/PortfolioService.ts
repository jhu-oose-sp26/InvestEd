import { prisma } from '@/lib/prisma'
import { getMarketDataProvider } from '../market-data/MarketDataProvider'
import { Decimal } from '@prisma/client/runtime/library'
import type { PositionValue, PortfolioSummary } from '@/types'

// Re-export types for backward compatibility
export type { PositionValue, PortfolioSummary } from '@/types'

/**
 * PortfolioService handles portfolio valuation and P&L calculations
 */
export class PortfolioService {
  /**
   * Calculates current portfolio value and P&L for a user
   * Fetches current market prices and compares against cost basis
   */
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    // Get user cash balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cashBalance: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get all positions
    const positions = await prisma.position.findMany({
      where: { userId },
    })

    if (positions.length === 0) {
      return {
        totalCash: user.cashBalance.toNumber(),
        totalInvested: 0,
        totalCurrentValue: 0,
        totalPortfolioValue: user.cashBalance.toNumber(),
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

    // Calculate position values
    type PositionRow = (typeof positions)[number]
    const positionValues: PositionValue[] = positions.map((position: PositionRow) => {
      const currentPrice = priceMap.get(position.symbol) ?? position.averageBuyPrice.toNumber()
      const totalCost = position.averageBuyPrice.times(position.quantity).toNumber()
      const currentValue = currentPrice * position.quantity
      const unrealizedPnL = currentValue - totalCost
      const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0

      return {
        symbol: position.symbol,
        quantity: position.quantity,
        averageBuyPrice: position.averageBuyPrice.toNumber(),
        currentPrice,
        totalCost,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
      }
    })

    // Calculate totals
    const totalCash = user.cashBalance.toNumber()
    const totalInvested = positionValues.reduce((sum, p) => sum + p.totalCost, 0)
    const totalCurrentValue = positionValues.reduce((sum, p) => sum + p.currentValue, 0)
    const totalPortfolioValue = totalCash + totalCurrentValue
    const totalUnrealizedPnL = totalCurrentValue - totalInvested
    const totalUnrealizedPnLPercent =
      totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0

    return {
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

