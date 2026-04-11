import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import type { PlaceLimitOrderInput, LimitOrderResult } from '@/types'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

const PlaceLimitOrderSchema = z.object({
  userId: z.string(),
  marketId: z.string(),
  side: z.enum(['YES', 'NO']),
  orderType: z.enum(['LIMIT', 'IOC']).default('LIMIT'),
  limitPrice: z.number().gt(0).lte(1),
  quantity: z.number().int().positive(),
})

export class LimitOrderService {
  async placeOrder(input: PlaceLimitOrderInput): Promise<LimitOrderResult> {
    const parsed = PlaceLimitOrderSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.message }

    const { userId, marketId, side, orderType, limitPrice, quantity } = parsed.data

    try {
      const orderId = await prisma.$transaction(async (tx: Tx) => {
        const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } })
        if (market.status !== 'OPEN') throw new Error('Market is not open')

        // YES buyers pay limitPrice per share.
        // NO buyers post (1 - limitPrice) as collateral — their max loss if YES wins.
        const reserved = side === 'NO'
          ? new Decimal(1).minus(limitPrice).times(quantity)
          : new Decimal(limitPrice).times(quantity)
        await this.reserveCash(tx, userId, reserved)

        const order = await tx.limitOrder.create({
          data: { userId, marketId, side, orderType, limitPrice, quantity },
        })
        return order.id
      })
      return { success: true, orderId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async cancelOrder(orderId: string, userId: string): Promise<LimitOrderResult> {
    try {
      await prisma.$transaction(async (tx: Tx) => {
        const order = await tx.limitOrder.findUniqueOrThrow({ where: { id: orderId } })
        if (order.userId !== userId) throw new Error('Not authorized')
        if (order.status !== 'OPEN') throw new Error('Order is not open')

        // Refund the reservation (mirrors placeOrder reservation logic)
        const refund = order.side === 'NO'
          ? new Decimal(1).minus(order.limitPrice).times(order.quantity)
          : new Decimal(order.limitPrice).times(order.quantity)
        await this.releaseCash(tx, userId, refund)
        await tx.limitOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
      })
      return { success: true, orderId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Standard order-book matching: cross when YES_bid >= NO_bid.
   * "Buy NO at Q" = offer to sell YES at Q, posting (1-Q) as collateral.
   * Execute at the NO bid (ask) price; refund the YES buyer's overbid.
   * Supports partial fills: advances index only when an order is fully consumed.
   */
  async matchOrders(marketId: string): Promise<number> {
    const candidates = await prisma.limitOrder.findMany({
      where: { marketId, status: 'OPEN' },
    })

    // Best bid first for both sides
    const yesOrders = candidates
      .filter(o => o.side === 'YES')
      .sort((a, b) => Number(b.limitPrice) - Number(a.limitPrice))
    const noOrders = candidates
      .filter(o => o.side === 'NO')
      .sort((a, b) => Number(b.limitPrice) - Number(a.limitPrice))

    // Track remaining qty locally so we can partial-fill within one matchOrders call
    const yesRem = yesOrders.map(o => o.quantity)
    const noRem = noOrders.map(o => o.quantity)

    let filled = 0
    let yi = 0, ni = 0

    while (yi < yesOrders.length && ni < noOrders.length) {
      const yes = yesOrders[yi]
      const no = noOrders[ni]

      // Cross when YES_bid >= NO_bid (NO bid = ask price for YES)
      if (Number(yes.limitPrice) < Number(no.limitPrice)) break

      const matchQty = Math.min(yesRem[yi], noRem[ni])
      const askPrice = new Decimal(no.limitPrice)
      // YES buyer bid more than the ask → refund the difference
      const yesRefund = new Decimal(yes.limitPrice).minus(askPrice).times(matchQty)

      try {
        await prisma.$transaction(async (tx: Tx) => {
          const y = await tx.limitOrder.findUniqueOrThrow({ where: { id: yes.id } })
          const n = await tx.limitOrder.findUniqueOrThrow({ where: { id: no.id } })
          if (y.status !== 'OPEN' || n.status !== 'OPEN') throw new Error('Order no longer open')

          if (yesRefund.gt(0)) await this.releaseCash(tx, y.userId, yesRefund)
          // NO buyer posted exact collateral (1 - limitPrice)*qty — nothing to refund

          await this.grantShares(tx, y.userId, y.marketId, 'YES', matchQty)
          await this.grantShares(tx, n.userId, n.marketId, 'NO', matchQty)

          const now = new Date()
          if (matchQty >= y.quantity) {
            await tx.limitOrder.update({ where: { id: y.id }, data: { status: 'FILLED', filledAt: now } })
          } else {
            await tx.limitOrder.update({ where: { id: y.id }, data: { quantity: { decrement: matchQty } } })
          }
          if (matchQty >= n.quantity) {
            await tx.limitOrder.update({ where: { id: n.id }, data: { status: 'FILLED', filledAt: now } })
          } else {
            await tx.limitOrder.update({ where: { id: n.id }, data: { quantity: { decrement: matchQty } } })
          }
        })

        filled += matchQty
        yesRem[yi] -= matchQty
        noRem[ni] -= matchQty
        if (yesRem[yi] === 0) yi++
        if (noRem[ni] === 0) ni++
      } catch (e) {
        console.error('Match failed:', e)
        yi++
        ni++
      }
    }
    return filled
  }

  async getUserOrders(userId: string) {
    return prisma.limitOrder.findMany({
      where: { userId },
      include: { market: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  // --- helpers ---

  private async reserveCash(tx: Tx, userId: string, amount: Decimal) {
    const portfolio = await tx.portfolio.findFirstOrThrow({ where: { userId } })
    if (portfolio.cashBalance.lessThan(amount)) {
      throw new Error(`Insufficient cash. Required: $${amount}, Available: $${portfolio.cashBalance}`)
    }
    await tx.portfolio.update({ where: { id: portfolio.id }, data: { cashBalance: { decrement: amount } } })
  }

  private async releaseCash(tx: Tx, userId: string, amount: Decimal) {
    const portfolio = await tx.portfolio.findFirstOrThrow({ where: { userId } })
    await tx.portfolio.update({ where: { id: portfolio.id }, data: { cashBalance: { increment: amount } } })
  }

  private async grantShares(tx: Tx, userId: string, marketId: string, side: 'YES' | 'NO', quantity: number) {
    if (side === 'YES') {
      await tx.marketPosition.upsert({
        where: { userId_marketId: { userId, marketId } },
        create: { userId, marketId, yesQuantity: quantity },
        update: { yesQuantity: { increment: quantity } },
      })
    } else {
      await tx.marketPosition.upsert({
        where: { userId_marketId: { userId, marketId } },
        create: { userId, marketId, noQuantity: quantity },
        update: { noQuantity: { increment: quantity } },
      })
    }
  }
}

export const limitOrderService = new LimitOrderService()
