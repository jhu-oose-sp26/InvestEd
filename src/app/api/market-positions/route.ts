import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

  try {
    // Fetch positions with market info
    const positions = await prisma.marketPosition.findMany({
      where: { userId, OR: [{ yesQuantity: { gt: 0 } }, { noQuantity: { gt: 0 } }] },
      include: { market: { select: { id: true, title: true, status: true, outcome: true } } },
    })

    // Get the user's filled orders to compute cost basis per market
    const marketIds = positions.map(p => p.marketId)
    const filledOrders = await prisma.limitOrder.findMany({
      where: { userId, marketId: { in: marketIds }, status: 'FILLED' },
      select: { marketId: true, side: true, limitPrice: true, quantity: true },
    })

    // Build cost basis map: { marketId: { yesCost, noCost } }
    const costMap = new Map<string, { yesCost: number; noCost: number }>()
    for (const order of filledOrders) {
      const entry = costMap.get(order.marketId) ?? { yesCost: 0, noCost: 0 }
      const price = Number(order.limitPrice)
      if (order.side === 'YES') {
        // YES buyers pay limitPrice per share (execution happens at ask, but they paid the ask or less)
        entry.yesCost += price * order.quantity
      } else {
        // NO buyers pay (1 - limitPrice) per share
        entry.noCost += (1 - price) * order.quantity
      }
      costMap.set(order.marketId, entry)
    }

    // Get last traded price per market for current valuation
    const lastFills = await prisma.limitOrder.findMany({
      where: { marketId: { in: marketIds }, side: 'NO', status: 'FILLED' },
      orderBy: { filledAt: 'desc' },
      distinct: ['marketId'],
      select: { marketId: true, limitPrice: true },
    })
    const lastPriceMap = new Map(lastFills.map(f => [f.marketId, Number(f.limitPrice)]))

    // Enrich positions with cost, current value, and PnL
    const enriched = positions.map(pos => {
      const lastPrice = lastPriceMap.get(pos.marketId) ?? 0.5
      const cost = costMap.get(pos.marketId) ?? { yesCost: 0, noCost: 0 }
      const totalCost = cost.yesCost + cost.noCost

      let currentValue: number
      let pnl: number
      if (pos.market.status === 'RESOLVED') {
        // Resolved: winning side pays $1/share
        currentValue = pos.market.outcome
          ? pos.yesQuantity * 1
          : pos.noQuantity * 1
        pnl = currentValue - totalCost
      } else {
        // Open: value at last traded price
        currentValue = pos.yesQuantity * lastPrice + pos.noQuantity * (1 - lastPrice)
        pnl = currentValue - totalCost
      }

      return {
        id: pos.id,
        marketId: pos.marketId,
        yesQuantity: pos.yesQuantity,
        noQuantity: pos.noQuantity,
        market: pos.market,
        costBasis: Math.round(totalCost * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        lastPrice: Math.round(lastPrice * 100) / 100,
      }
    })

    // Compute totals
    const totalCostBasis = enriched.reduce((s, p) => s + p.costBasis, 0)
    const totalCurrentValue = enriched.reduce((s, p) => s + p.currentValue, 0)
    const totalPnl = enriched.reduce((s, p) => s + p.pnl, 0)

    // Get open orders value (cash reserved in open orders)
    const openOrders = await prisma.limitOrder.findMany({
      where: { userId, marketId: { in: marketIds }, status: 'OPEN' },
      select: { side: true, limitPrice: true, quantity: true },
    })
    const openOrdersValue = openOrders.reduce((sum, o) => {
      const price = Number(o.limitPrice)
      return sum + (o.side === 'NO' ? (1 - price) * o.quantity : price * o.quantity)
    }, 0)

    return NextResponse.json({
      positions: enriched,
      summary: {
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
        totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        openOrdersValue: Math.round(openOrdersValue * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
