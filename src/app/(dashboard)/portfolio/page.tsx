"use client"

import { useEffect, useState } from "react"

interface PortfolioSummary {
  totalCash: number
  totalInvested: number
  totalCurrentValue: number
  totalPortfolioValue: number
  totalUnrealizedPnL: number
  totalUnrealizedPnLPercent: number
  positions: Array<{
    symbol: string
    quantity: number
    averageBuyPrice: number
    currentPrice: number
    totalCost: number
    currentValue: number
    unrealizedPnL: number
    unrealizedPnLPercent: number
  }>
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const response = await fetch("/api/portfolio")
      if (!response.ok) {
        throw new Error("Failed to fetch portfolio")
      }
      const data = await response.json()
      setPortfolio(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading portfolio...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>
  }

  if (!portfolio) {
    return <div className="text-center py-8">No portfolio data available</div>
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-6 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Cash Balance</div>
          <div className="text-2xl font-bold">{formatCurrency(portfolio.totalCash)}</div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Total Invested</div>
          <div className="text-2xl font-bold">{formatCurrency(portfolio.totalInvested)}</div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold">{formatCurrency(portfolio.totalPortfolioValue)}</div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Unrealized P&L</div>
          <div
            className={`text-2xl font-bold ${
              portfolio.totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(portfolio.totalUnrealizedPnL)} ({formatPercent(portfolio.totalUnrealizedPnLPercent)})
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="border rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b">Positions</h2>
        {portfolio.positions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No positions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Symbol</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Avg. Buy Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Current Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Total Cost</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Current Value</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((position) => (
                  <tr key={position.symbol} className="border-t">
                    <td className="px-4 py-3 font-medium">{position.symbol}</td>
                    <td className="px-4 py-3">{position.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(position.averageBuyPrice)}</td>
                    <td className="px-4 py-3">{formatCurrency(position.currentPrice)}</td>
                    <td className="px-4 py-3">{formatCurrency(position.totalCost)}</td>
                    <td className="px-4 py-3">{formatCurrency(position.currentValue)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        position.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(position.unrealizedPnL)} ({formatPercent(position.unrealizedPnLPercent)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

