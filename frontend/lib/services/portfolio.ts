/**
 * Portfolio Service
 * 
 * TODO: Implement portfolio-related API calls
 * - Fetch user portfolio
 * - Get portfolio performance metrics
 * - Calculate portfolio value
 * - Fetch position details
 */

import { apiRequest } from './api'

export interface Portfolio {
  userId: string
  cash: number
  totalValue: number
  totalReturn: number
  positions: Position[]
}

export interface Position {
  ticker: string
  quantity: number
  avgEntryPrice: number
  currentPrice: number
  unrealizedPnL: number
}

/**
 * TODO: Fetch user portfolio from backend
 */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  // TODO: Implement API call to /api/portfolio/:userId
  throw new Error('Not implemented')
}

/**
 * TODO: Calculate portfolio metrics on the frontend
 * This can be used for real-time updates without backend calls
 */
export function calculatePortfolioValue(
  cash: number,
  positions: Position[]
): number {
  // TODO: Implement calculation
  // PortfolioValue = Cash + Σ(Holdings × CurrentPrice)
  throw new Error('Not implemented')
}

