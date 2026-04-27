import { prisma } from '@/lib/prisma'
import { getLiveQuotes } from '../market-data/finnhub/finnhubLiveQuoteService'
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
    // Get portfolio cash balance and owner
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, name: true, cashBalance: true, userId: true },
    })

    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    // Get all positions
    const positions = await prisma.position.findMany({
      where: { portfolioId },
    })

    // Value open prediction market positions at the last traded price per market.
    // Execution price = NO limitPrice of most recent fill (we execute at the ask).
    // YES shares worth `price`, NO shares worth `1 - price`. Falls back to 0.5 if no trades yet.
    const marketPositions = await prisma.marketPosition.findMany({
      where: { userId: portfolio.userId, market: { status: 'OPEN' } },
    })
    let predictionPositionsValue = 0
    if (marketPositions.length > 0) {
      const mids = marketPositions.map(p => p.marketId)
      const lastFills = await prisma.limitOrder.findMany({
        where: { marketId: { in: mids }, side: 'NO', status: 'FILLED' },
        orderBy: { filledAt: 'desc' },
        distinct: ['marketId'],
        select: { marketId: true, limitPrice: true },
      })
      const lastPrice = new Map(lastFills.map(f => [f.marketId, Number(f.limitPrice)]))
      predictionPositionsValue = marketPositions.reduce((sum, p) => {
        const price = lastPrice.get(p.marketId) ?? 0.5
        return sum + p.yesQuantity * price + p.noQuantity * (1 - price)
      }, 0)
    }

    if (positions.length === 0) {
      const totalCash = portfolio.cashBalance.toNumber()
      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        totalCash,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalPortfolioValue: totalCash + predictionPositionsValue,
        totalUnrealizedPnL: 0,
        totalUnrealizedPnLPercent: 0,
        positions: [],
        predictionPositionsValue,
      }
    }

    // Fetch current prices for all symbols using Finnhub API
    const symbols = positions.map((p: { symbol: string }) => p.symbol)
    const quotes = await getLiveQuotes(symbols, process.env.FINNHUB_API_KEY)

    // Create a map for quick lookup
    const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]))

    const positionValues: PositionValue[] = computePositionValuesFromPriceMap(positions, priceMap)

    // Calculate totals
    const totalCash = portfolio.cashBalance.toNumber()
    const totalInvested = positionValues.reduce((sum, p) => sum + p.totalCost, 0)
    const totalCurrentValue = positionValues.reduce((sum, p) => sum + p.currentValue, 0)
    const totalPortfolioValue = totalCash + totalCurrentValue + predictionPositionsValue
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
      predictionPositionsValue,
    }
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService()
