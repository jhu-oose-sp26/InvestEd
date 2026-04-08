import { Decimal } from '@prisma/client/runtime/library'

export type ExecuteTradeInput = {
    portfolioId: string
    symbol: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
}

export interface TradeResult {
    success: boolean
    tradeId?: string
    error?: string
    newCashBalance?: Decimal
    positionQuantity?: number
}
