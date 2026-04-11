import type { Decimal } from '@prisma/client/runtime/library'
import type { PositionValue } from '@/types'

/** Minimal position shape for mark-to-market (Prisma `Position` rows). */
export type PositionRowForValuation = {
  symbol: string
  quantity: number
  averageBuyPrice: Decimal
}

/**
 * Maps positions to current values using `priceMap`, falling back to average cost when a symbol is missing.
 */
export function computePositionValuesFromPriceMap(
  positions: PositionRowForValuation[],
  priceMap: Map<string, number>
): PositionValue[] {
  return positions.map((position) => {
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
}

/**
 * Total portfolio value: cash + sum of position current values (same formula as portfolio summary).
 */
export function computeTotalPortfolioValue(
  cashBalance: number,
  positions: PositionRowForValuation[],
  priceMap: Map<string, number>
): number {
  if (positions.length === 0) return cashBalance
  const positionValues = computePositionValuesFromPriceMap(positions, priceMap)
  const totalCurrentValue = positionValues.reduce((sum, p) => sum + p.currentValue, 0)
  return cashBalance + totalCurrentValue
}
