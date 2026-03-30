import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'
import { portfolioService } from './PortfolioService'

export type PortfolioHistoryPoint = { at: string; value: number }

type PositionState = Map<string, { qty: number; avgPrice: number }>

type TradeSlice = {
  type: 'BUY' | 'SELL'
  symbol: string
  quantity: number
  price: Decimal
  totalValue: Decimal
}

function applyTrade(
  cash: number,
  positions: PositionState,
  trade: TradeSlice
): number {
  const tv = trade.totalValue.toNumber()
  if (trade.type === 'BUY') {
    const newCash = cash - tv
    const p = positions.get(trade.symbol)
    if (!p) {
      positions.set(trade.symbol, { qty: trade.quantity, avgPrice: trade.price.toNumber() })
    } else {
      const q = p.qty + trade.quantity
      const avg = (p.avgPrice * p.qty + trade.price.toNumber() * trade.quantity) / q
      positions.set(trade.symbol, { qty: q, avgPrice: avg })
    }
    return newCash
  }
  const p = positions.get(trade.symbol)
  if (!p || p.qty < trade.quantity) {
    throw new Error('Trade history does not match positions')
  }
  const newCash = cash + tv
  const q = p.qty - trade.quantity
  if (q === 0) positions.delete(trade.symbol)
  else positions.set(trade.symbol, { qty: q, avgPrice: p.avgPrice })
  return newCash
}

async function markToMarket(cash: number, positions: PositionState, at: Date): Promise<number> {
  const entries = [...positions].filter(([, pos]) => pos.qty > 0)
  if (entries.length === 0) return cash

  const positionValues = await Promise.all(
    entries.map(async ([symbol, pos]) => {
      const bar = await prisma.marketPrice.findFirst({
        where: {
          symbol,
          timeframe: '1Min',
          timestamp: { lte: at },
        },
        orderBy: { timestamp: 'desc' },
        select: { close: true },
      })
      const px = bar?.close.toNumber() ?? pos.avgPrice
      return pos.qty * px
    })
  )

  return cash + positionValues.reduce((sum, v) => sum + v, 0)
}

/**
 * Portfolio value over time: starting balance at account creation, then after each trade,
 * then current value. Uses 1Min bars when available; otherwise cost basis for each symbol.
 */
export async function getPortfolioValueHistory(userId: string): Promise<PortfolioHistoryPoint[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cashBalance: true, createdAt: true },
  })
  if (!user) {
    throw new Error('User not found')
  }

  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: [{ executedAt: 'asc' }, { id: 'asc' }],
  })

  let buySum = 0
  let sellSum = 0
  for (const t of trades) {
    const v = t.totalValue.toNumber()
    if (t.type === 'BUY') buySum += v
    else sellSum += v
  }

  const initialCash = user.cashBalance.toNumber() + buySum - sellSum
  const points: PortfolioHistoryPoint[] = [
    { at: user.createdAt.toISOString(), value: initialCash },
  ]

  let cash = initialCash
  const positions: PositionState = new Map()

  for (const trade of trades) {
    cash = applyTrade(cash, positions, trade)
    const value = await markToMarket(cash, positions, trade.executedAt)
    points.push({ at: trade.executedAt.toISOString(), value })
  }

  const summary = await portfolioService.getPortfolioSummary(userId)
  points.push({ at: new Date().toISOString(), value: summary.totalPortfolioValue })

  return points
}
