/**
 * Portfolio Performance Service
 * 
 * Calculates portfolio metrics:
 * - Portfolio Value = Cash + Σ(Holdings × CurrentPrice)
 * - Total Return = (PortfolioValue - InitialBalance) / InitialBalance × 100
 * 
 * TODO: Implement portfolio calculations
 * TODO: Cache calculations for performance
 * TODO: Support real-time updates via WebSocket
 */

import { PrismaClient } from '@prisma/client'
import { MarketService } from './MarketService'

export interface PortfolioMetrics {
  userId: string
  cash: number
  totalValue: number
  totalReturn: number
  totalReturnPercent: number
  positions: PositionValue[]
}

export interface PositionValue {
  ticker: string
  quantity: number
  avgEntryPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
}

export class PortfolioService {
  constructor(
    private prisma: PrismaClient,
    private marketService: MarketService
  ) {}

  /**
   * Calculate portfolio value for a user
   * 
   * Formula: PortfolioValue = Cash + Σ(Holdings × CurrentPrice)
   * 
   * TODO: Fetch user balance and positions
   * TODO: Fetch current prices for all positions
   * TODO: Calculate total value
   */
  async calculatePortfolioValue(userId: string): Promise<PortfolioMetrics> {
    // TODO: Fetch user with balance
    // const user = await this.prisma.user.findUnique({
    //   where: { id: userId }
    // })
    // if (!user) throw new Error('User not found')

    // TODO: Fetch all positions
    // const positions = await this.prisma.position.findMany({
    //   where: { userId }
    // })

    // TODO: Fetch current prices for all tickers
    // const positionValues: PositionValue[] = await Promise.all(
    //   positions.map(async (pos) => {
    //     const currentPrice = await this.marketService.fetchCurrentPrice(pos.ticker)
    //     const marketValue = Number(pos.quantity) * currentPrice
    //     const unrealizedPnL = marketValue - (Number(pos.quantity) * Number(pos.avgEntryPrice))
    //     const unrealizedPnLPercent = (unrealizedPnL / (Number(pos.quantity) * Number(pos.avgEntryPrice))) * 100

    //     return {
    //       ticker: pos.ticker,
    //       quantity: Number(pos.quantity),
    //       avgEntryPrice: Number(pos.avgEntryPrice),
    //       currentPrice,
    //       marketValue,
    //       unrealizedPnL,
    //       unrealizedPnLPercent
    //     }
    //   })
    // )

    // TODO: Calculate total value
    // const cash = Number(user.balance)
    // const holdingsValue = positionValues.reduce((sum, pos) => sum + pos.marketValue, 0)
    // const totalValue = cash + holdingsValue

    // TODO: Calculate total return
    // const initialBalance = 10000 // TODO: Store initial balance or calculate from first trade
    // const totalReturn = totalValue - initialBalance
    // const totalReturnPercent = (totalReturn / initialBalance) * 100

    // return {
    //   userId,
    //   cash,
    //   totalValue,
    //   totalReturn,
    //   totalReturnPercent,
    //   positions: positionValues
    // }

    throw new Error('Portfolio calculation not implemented')
  }

  /**
   * Calculate leaderboard rankings
   * 
   * TODO: Implement ranking based on percentage return (fair for different starting balances)
   * TODO: Support group-based leaderboards
   * TODO: Optimize with database queries
   */
  async calculateLeaderboard(groupId?: string): Promise<Array<{
    userId: string
    email: string
    totalReturnPercent: number
    rank: number
  }>> {
    // TODO: Fetch all users (or users in group)
    // TODO: Calculate portfolio metrics for each user
    // TODO: Sort by totalReturnPercent descending
    // TODO: Assign ranks
    // TODO: Return top N results

    throw new Error('Leaderboard calculation not implemented')
  }
}

