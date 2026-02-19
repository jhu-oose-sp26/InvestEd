/**
 * Type Definitions
 * 
 * Shared types across the backend
 */

export type OrderType = 'BUY' | 'SELL'

export interface TradeRequest {
  userId: string
  ticker: string
  quantity: number
  orderType: OrderType
}

export interface MarketPrice {
  ticker: string
  price: number
  timestamp: Date
}

export interface PortfolioMetrics {
  userId: string
  cash: number
  totalValue: number
  totalReturn: number
  totalReturnPercent: number
}

