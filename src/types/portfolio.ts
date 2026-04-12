export interface PositionValue {
    symbol: string
    quantity: number
    averageBuyPrice: number
    currentPrice: number
    totalCost: number
    currentValue: number
    unrealizedPnL: number
    unrealizedPnLPercent: number
    sector?: string
}

export interface PortfolioSummary {
    portfolioId: string
    portfolioName: string
    totalCash: number
    totalInvested: number
    totalCurrentValue: number
    totalPortfolioValue: number
    totalUnrealizedPnL: number
    totalUnrealizedPnLPercent: number
    positions: PositionValue[]
    predictionPositionsValue?: number
}

export interface LeaderboardEntry {
    rank: number
    portfolioId: string
    portfolioName: string
    userId: string
    displayName: string
    totalPortfolioValue: number
}
