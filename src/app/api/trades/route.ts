import { NextRequest, NextResponse } from 'next/server'
import { tradeService } from '@/features/trading/TradeService'
import { resolveTradeExecutionPrice } from '@/features/market-data/executionPrice'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'

import { prisma } from '@/lib/prisma'

/** Trade pricing may use Finnhub (`ws`); keep on Node runtime. */
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, type, quantity } = body

    if (!symbol || !type || !quantity) {
      return httpErrorResponse('IE_VAL_007', 400)
    }

    if (type !== 'BUY' && type !== 'SELL') {
      return httpErrorResponse('IE_VAL_008', 400)
    }

    const userId = 'temp-user-id'
    
    // Find the primary portfolio for the user (assuming one for now as per temp-user-id usage)
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    })
    
    if (!portfolio) {
      console.error(`No portfolio found for user ${userId}`)
      return httpErrorResponse('IE_PFO_001', 500) // Or new error code
    }

    const { price, source: executionPriceSource } = await resolveTradeExecutionPrice(symbol)

    const result = await tradeService.executeTrade({
      portfolioId: portfolio.id,
      symbol,
      type,
      quantity: parseInt(quantity),
      price,
    })

    if (!result.success) {
      console.warn('Trade rejected:', result.error)
      return NextResponse.json(httpErrorBody('IE_TRD_001'), { status: 400 })
    }

    return NextResponse.json({
      success: true,
      tradeId: result.tradeId,
      executionPrice: price,
      executionPriceSource,
      newCashBalance: result.newCashBalance?.toString(),
      positionQuantity: result.positionQuantity,
    })
  } catch (error) {
    console.error('Trade API error:', error)
    return httpErrorResponse('IE_TRD_002', 500)
  }
}
