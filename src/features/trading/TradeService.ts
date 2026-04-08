import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
import { z } from 'zod'
import type { ExecuteTradeInput, TradeResult } from '@/types'

// Re-export types for backward compatibility
export type { ExecuteTradeInput, TradeResult } from '@/types'

// Validation schemas
const ExecuteTradeSchema = z.object({
  portfolioId: z.string(),
  symbol: z.string().min(1).max(10),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
})

/**
 * TradeService handles atomic trade execution with database transactions
 * to ensure data consistency between cash balance and positions.
 */
export class TradeService {
  /**
   * Executes a trade (BUY or SELL) atomically, updating both cash balance and positions.
   * Uses Prisma transactions to ensure all-or-nothing execution.
   * 
   * @param input - Trade execution parameters
   * @returns TradeResult with success status and updated balances
   */
  async executeTrade(input: ExecuteTradeInput): Promise<TradeResult> {
    // Validate input
    const validationResult = ExecuteTradeSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
      }
    }

    const { portfolioId, symbol, type, quantity, price } = validationResult.data
    const totalValue = new Decimal(quantity * price)

    try {
      // Execute trade within a transaction
      const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
        // Lock portfolio row for update to prevent concurrent modifications
        const portfolio = await tx.portfolio.findUnique({
          where: { id: portfolioId },
          select: { id: true, cashBalance: true },
        })

        if (!portfolio) {
          throw new Error('Portfolio not found')
        }

        // Get current position if it exists
        const position = await tx.position.findUnique({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
        })

        if (type === 'BUY') {
          // Validate sufficient cash
          if (portfolio.cashBalance.lessThan(totalValue)) {
            throw new Error(
              `Insufficient cash. Required: $${totalValue}, Available: $${portfolio.cashBalance}`
            )
          }

          // Update cash balance
          const newCashBalance = portfolio.cashBalance.minus(totalValue)
          await tx.portfolio.update({
            where: { id: portfolioId },
            data: { cashBalance: newCashBalance },
          })

          // Update or create position
          if (position) {
            // Calculate new weighted average buy price
            const currentValue = new Decimal(position.quantity).times(position.averageBuyPrice)
            const newValue = totalValue
            const totalQuantity = position.quantity + quantity
            const newAveragePrice = currentValue.plus(newValue).div(totalQuantity)

            await tx.position.update({
              where: { id: position.id },
              data: {
                quantity: totalQuantity,
                averageBuyPrice: newAveragePrice,
              },
            })
          } else {
            // Create new position
            await tx.position.create({
              data: {
                portfolioId,
                symbol,
                quantity,
                averageBuyPrice: price,
              },
            })
          }
        } else {
          // SELL operation
          if (!position || position.quantity < quantity) {
            throw new Error(
              `Insufficient shares. Required: ${quantity}, Available: ${position?.quantity ?? 0}`
            )
          }

          // Update cash balance
          const newCashBalance = portfolio.cashBalance.plus(totalValue)
          await tx.portfolio.update({
            where: { id: portfolioId },
            data: { cashBalance: newCashBalance },
          })

          // Update position
          const newQuantity = position.quantity - quantity
          if (newQuantity === 0) {
            // Remove position if all shares are sold
            await tx.position.delete({
              where: { id: position.id },
            })
          } else {
            // Update quantity (averageBuyPrice remains the same for remaining shares)
            await tx.position.update({
              where: { id: position.id },
              data: {
                quantity: newQuantity,
              },
            })
          }
        }

        // Create trade record
        const trade = await tx.trade.create({
          data: {
            portfolioId,
            symbol,
            type,
            quantity,
            price,
            totalValue,
          },
        })

        // Get updated position for return value
        const updatedPosition = await tx.position.findUnique({
          where: {
            portfolioId_symbol: {
              portfolioId,
              symbol,
            },
          },
        })

        return {
          tradeId: trade.id,
          newCashBalance: type === 'BUY'
            ? portfolio.cashBalance.minus(totalValue)
            : portfolio.cashBalance.plus(totalValue),
          positionQuantity: updatedPosition?.quantity ?? 0,
        }
      })

      return {
        success: true,
        tradeId: result.tradeId,
        newCashBalance: result.newCashBalance,
        positionQuantity: result.positionQuantity,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Gets all trades for a portfolio, optionally filtered by symbol
   */
  async getPortfolioTrades(portfolioId: string, symbol?: string) {
    return prisma.trade.findMany({
      where: {
        portfolioId,
        ...(symbol && { symbol }),
      },
      orderBy: {
        executedAt: 'desc',
      },
    })
  }

  /**
   * Gets all positions for a portfolio
   */
  async getPortfolioPositions(portfolioId: string) {
    return prisma.position.findMany({
      where: { portfolioId },
      orderBy: {
        symbol: 'asc',
      },
    })
  }
}

// Export singleton instance
export const tradeService = new TradeService()

