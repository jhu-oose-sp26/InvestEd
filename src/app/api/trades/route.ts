import { NextRequest, NextResponse } from 'next/server'
import { tradeService } from '@/features/trading/TradeService'
import { resolveTradeExecutionPrice } from '@/features/market-data/executionPrice'

/** Trade pricing may use Finnhub (`ws`); keep on Node runtime. */
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, type, quantity, portfolioId } = body

    // Validate required fields
    if (!symbol || !type || !quantity || !portfolioId) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, type, quantity, portfolioId' },
        { status: 400 }
      )
    }

    // Validate trade type
    if (type !== 'BUY' && type !== 'SELL') {
      return NextResponse.json(
        { error: 'Invalid trade type. Must be BUY or SELL' },
        { status: 400 }
      )
    }

    // Finnhub live (WS cache + REST) when FINNHUB_API_KEY is set; else Postgres latest close
    const { price, source: executionPriceSource } = await resolveTradeExecutionPrice(symbol)

    // Execute trade
    const result = await tradeService.executeTrade({
      portfolioId,
      symbol,
      type,
      quantity: parseInt(quantity),
      price,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Trade execution failed' },
        { status: 400 }
      )
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
