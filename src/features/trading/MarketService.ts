import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { CreateMarketInput, MarketResult } from '@/types'
import { computeOrderReservation } from './orderPricing'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

const CreateMarketSchema = z.object({
  creatorId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  resolutionDate: z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date'),
})

export class MarketService {
  async createMarket(input: CreateMarketInput): Promise<MarketResult> {
    const parsed = CreateMarketSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.message }

    const { creatorId, title, description, resolutionDate } = parsed.data
    const market = await prisma.market.create({
      data: { creatorId, title, description, resolutionDate: new Date(resolutionDate) },
    })
    return { success: true, marketId: market.id }
  }

  async listMarkets(status?: 'OPEN' | 'RESOLVED' | 'CANCELLED') {
    return prisma.market.findMany({
      where: status ? { status } : undefined,
      include: { creator: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async resolveMarket(marketId: string, outcome: boolean, callerId: string): Promise<MarketResult> {
    try {
      await prisma.$transaction(async (tx: Tx) => {
        const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } })
        if (market.creatorId !== callerId) throw new Error('FORBIDDEN: only the market creator can resolve this market')
        if (market.status !== 'OPEN') throw new Error('Market is not open')

        // Cancel all remaining open orders and refund reserved cash to portfolio
        const openOrders = await tx.limitOrder.findMany({ where: { marketId, status: 'OPEN' } })
        for (const order of openOrders) {
          const refund = computeOrderReservation(order.side, order.limitPrice, order.quantity)
          const portfolio = await tx.portfolio.findFirstOrThrow({ where: { userId: order.userId } })
          await tx.portfolio.update({ where: { id: portfolio.id }, data: { cashBalance: { increment: refund } } })
          await tx.limitOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
        }

        // Settle positions: winning side pays $1 per share into portfolio
        const positions = await tx.marketPosition.findMany({ where: { marketId } })
        for (const pos of positions) {
          const payout = outcome ? pos.yesQuantity : pos.noQuantity
          if (payout > 0) {
            const portfolio = await tx.portfolio.findFirstOrThrow({ where: { userId: pos.userId } })
            await tx.portfolio.update({ where: { id: portfolio.id }, data: { cashBalance: { increment: payout } } })
          }
          await tx.marketPosition.delete({ where: { id: pos.id } })
        }

        await tx.market.update({ where: { id: marketId }, data: { status: 'RESOLVED', outcome } })
      })
      return { success: true, marketId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const marketService = new MarketService()
