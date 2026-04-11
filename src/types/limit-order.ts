export type PlaceLimitOrderInput = {
  userId: string
  marketId: string
  side: 'YES' | 'NO'
  orderType: 'LIMIT' | 'IOC'
  limitPrice: number
  quantity: number
}

export interface LimitOrderResult {
  success: boolean
  orderId?: string
  error?: string
}

export interface OrderBookEntry {
  price: number
  quantity: number
}

export interface OrderBookSnapshot {
  marketId: string
  yesBids: OrderBookEntry[]
  noBids: OrderBookEntry[]
}

export interface CreateMarketInput {
  creatorId: string
  title: string
  description?: string
  resolutionDate: string // ISO date
}

export interface MarketResult {
  success: boolean
  marketId?: string
  error?: string
}
