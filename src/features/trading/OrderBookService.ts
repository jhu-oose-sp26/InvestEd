import { prisma } from '@/lib/prisma'
import type { OrderBookSnapshot, OrderBookEntry } from '@/types'

export class OrderBookService {
  async getOrderBook(marketId: string): Promise<OrderBookSnapshot> {
    const orders = await prisma.limitOrder.findMany({
      where: { marketId, status: 'OPEN' },
      select: { side: true, limitPrice: true, quantity: true },
    })

    const yesMap = new Map<string, number>()
    const noMap = new Map<string, number>()

    for (const o of orders) {
      const key = o.limitPrice.toFixed(4)
      const map = o.side === 'YES' ? yesMap : noMap
      map.set(key, (map.get(key) ?? 0) + o.quantity)
    }

    const toEntries = (map: Map<string, number>): OrderBookEntry[] =>
      Array.from(map, ([price, quantity]) => ({ price: parseFloat(price), quantity }))

    return {
      marketId,
      yesBids: toEntries(yesMap).sort((a, b) => b.price - a.price),
      noBids: toEntries(noMap).sort((a, b) => a.price - b.price),
    }
  }
}

export const orderBookService = new OrderBookService()
