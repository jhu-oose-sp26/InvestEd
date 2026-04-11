import { prisma } from '@/lib/prisma'
import type { Trade } from '@prisma/client'
import { portfolioService } from './PortfolioService'

export type PortfolioHistoryPoint = { at: string; value: number }

type PositionState = Map<string, { qty: number; avgPrice: number }>

function applyTrade(
  cash: number,
  positions: PositionState,
  trade: Pick<Trade, 'type' | 'symbol' | 'quantity' | 'price' | 'totalValue'>
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
  if (!p || p.qty < trade.quantity) throw new Error('Trade history does not match positions')
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
        where: { symbol, timeframe: '1Min', timestamp: { lte: at } },
        orderBy: { timestamp: 'desc' },
        select: { close: true },
      })
      const px = bar?.close.toNumber() ?? pos.avgPrice
      return pos.qty * px
    })
  )

  return cash + positionValues.reduce((sum, v) => sum + v, 0)
}

/** Cash reserved when a non-cancelled limit order was placed. */
function reservationAmount(side: string, limitPrice: number, quantity: number): number {
  return side === 'NO' ? (1 - limitPrice) * quantity : limitPrice * quantity
}

/**
 * Builds a lookup: given a marketId and a point in time, returns the last
 * execution price (= the NO limitPrice of the most recent fill at or before that time).
 * Falls back to 0.5 if no trades have occurred yet.
 */
function buildExecutionPriceLookup(
  fills: Array<{ marketId: string; limitPrice: number; filledAt: Date }>
): (marketId: string, at: Date) => number {
  // Group by market, sorted ascending by filledAt
  const byMarket = new Map<string, Array<{ at: Date; price: number }>>()
  for (const f of fills) {
    const list = byMarket.get(f.marketId) ?? []
    list.push({ at: f.filledAt, price: f.limitPrice })
    byMarket.set(f.marketId, list)
  }

  return (marketId, at) => {
    const history = byMarket.get(marketId)
    if (!history) return 0.5
    let price = 0.5
    for (const h of history) {
      if (h.at <= at) price = h.price
      else break
    }
    return price
  }
}

/**
 * Portfolio value over time: starting balance at portfolio creation, then after each trade
 * and limit order event, then current value.
 */
export async function getPortfolioValueHistory(portfolioId: string): Promise<PortfolioHistoryPoint[]> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    select: { cashBalance: true, createdAt: true, userId: true },
  })
  if (!portfolio) throw new Error('Portfolio not found')

  const [trades, limitOrders] = await Promise.all([
    prisma.trade.findMany({
      where: { portfolioId },
      orderBy: [{ executedAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.limitOrder.findMany({
      where: { userId: portfolio.userId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Pre-fetch all execution prices across all markets (NO fills = execution price)
  const marketIds = [...new Set(limitOrders.map(o => o.marketId))]
  const noFills = marketIds.length > 0
    ? await prisma.limitOrder.findMany({
        where: { marketId: { in: marketIds }, side: 'NO', status: 'FILLED' },
        orderBy: { filledAt: 'asc' },
        select: { marketId: true, limitPrice: true, filledAt: true },
      })
    : []

  const getExecutionPrice = buildExecutionPriceLookup(
    noFills.map(f => ({
      marketId: f.marketId,
      limitPrice: Number(f.limitPrice),
      filledAt: f.filledAt!,
    }))
  )

  // ── Reconstruct initial cash ───────────────────────────────────────────────
  let stockBuySum = 0, stockSellSum = 0
  for (const t of trades) {
    const v = t.totalValue.toNumber()
    if (t.type === 'BUY') stockBuySum += v
    else stockSellSum += v
  }

  let limitOutflow = 0
  for (const o of limitOrders) {
    if (o.status === 'CANCELLED') continue
    limitOutflow += reservationAmount(o.side, Number(o.limitPrice), o.quantity)
  }

  const initialCash = portfolio.cashBalance.toNumber() + stockBuySum - stockSellSum + limitOutflow

  // ── Build unified event timeline ───────────────────────────────────────────
  type StockEvent = { kind: 'trade'; at: Date; trade: (typeof trades)[number] }
  type LimitEvent = { kind: 'limit_placed' | 'limit_filled'; at: Date; order: (typeof limitOrders)[number] }
  type AnyEvent = StockEvent | LimitEvent

  const events: AnyEvent[] = [
    ...trades.map(t => ({ kind: 'trade' as const, at: t.executedAt, trade: t })),
    ...limitOrders
      .filter(o => o.status !== 'CANCELLED')
      .map(o => ({ kind: 'limit_placed' as const, at: o.createdAt, order: o })),
    ...limitOrders
      .filter(o => o.filledAt != null)
      .map(o => ({ kind: 'limit_filled' as const, at: o.filledAt!, order: o })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime())

  // ── Simulate forward ───────────────────────────────────────────────────────
  const points: PortfolioHistoryPoint[] = [
    { at: portfolio.createdAt.toISOString(), value: initialCash },
  ]

  let cash = initialCash
  const stockPositions: PositionState = new Map()
  const predShares = new Map<string, { yes: number; no: number }>()

  // Value prediction shares at last traded price (YES @ price, NO @ 1-price)
  const predValueAt = (at: Date) =>
    [...predShares.entries()].reduce((sum, [marketId, p]) => {
      const price = getExecutionPrice(marketId, at)
      return sum + p.yes * price + p.no * (1 - price)
    }, 0)

  for (const event of events) {
    if (event.kind === 'trade') {
      cash = applyTrade(cash, stockPositions, event.trade)
    } else if (event.kind === 'limit_placed') {
      cash -= reservationAmount(event.order.side, Number(event.order.limitPrice), event.order.quantity)
    } else {
      const o = event.order
      const pos = predShares.get(o.marketId) ?? { yes: 0, no: 0 }
      if (o.side === 'YES') pos.yes += o.quantity
      else pos.no += o.quantity
      predShares.set(o.marketId, pos)
    }

    const value = await markToMarket(cash, stockPositions, event.at) + predValueAt(event.at)
    const last = points[points.length - 1]
    if (new Date(last.at).getTime() === event.at.getTime()) {
      last.value = value
    } else {
      points.push({ at: event.at.toISOString(), value })
    }
  }

  const summary = await portfolioService.getPortfolioSummary(portfolioId)
  points.push({ at: new Date().toISOString(), value: summary.totalPortfolioValue })

  return points
}
