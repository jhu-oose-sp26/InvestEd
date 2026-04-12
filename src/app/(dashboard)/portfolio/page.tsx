"use client"

import { useEffect, useState } from "react"
import { DATA_UNAVAILABLE, softenPublicErrorMessage } from "@/lib/userFacingMessages"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

interface PortfolioHistoryPoint {
  at: string
  value: number
}

interface MarketPosition {
  id: string
  yesQuantity: number
  noQuantity: number
  market: { title: string; status: string; outcome: boolean | null }
}

interface PortfolioSummary {
  totalCash: number
  totalInvested: number
  totalCurrentValue: number
  totalPortfolioValue: number
  totalUnrealizedPnL: number
  totalUnrealizedPnLPercent: number
  predictionPositionsValue: number
  positions: Array<{
    symbol: string
    quantity: number
    averageBuyPrice: number
    currentPrice: number
    totalCost: number
    currentValue: number
    unrealizedPnL: number
    unrealizedPnLPercent: number
    sector?: string
  }>
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [history, setHistory] = useState<PortfolioHistoryPoint[] | null>(null)
  const [marketPositions, setMarketPositions] = useState<MarketPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with actual portfolio selection from user context
    const portfolioId = 'temp-portfolio-id'

    const load = async () => {
      try {
        const [portfolioRes, historyRes, marketPosRes] = await Promise.all([
          fetch("/api/portfolio"),
          fetch("/api/portfolio/history"),
          fetch("/api/market-positions"),
        ])
        const [portfolioData, historyData, marketPosData] = await Promise.all([
          portfolioRes.json().catch(() => ({})),
          historyRes.json().catch(() => ({})),
          marketPosRes.json().catch(() => ({})),
        ])
        setPortfolio(portfolioData)
        setHistory(historyData.points as PortfolioHistoryPoint[])
        setMarketPositions(marketPosData.positions ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong while loading your portfolio.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground animate-pulse">
        Loading your portfolio…
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-10 px-4 rounded-lg border bg-card">
        <p className="font-medium text-foreground">We couldn’t load your portfolio</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{error}</p>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="max-w-lg mx-auto text-center py-10 px-4 text-muted-foreground leading-relaxed">
        {DATA_UNAVAILABLE.portfolioMissing}
      </div>
    )
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

  // Build pie chart data: Cash + positions by current value
  const pieData = [
    ...(portfolio.totalCash > 0 ? [{ name: "Cash", value: portfolio.totalCash }] : []),
    ...portfolio.positions.map((p) => ({
      name: p.symbol,
      value: p.currentValue,
    })),
  ]

  const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]

  const sectorMap = new Map<string, number>()
  for (const p of portfolio.positions) {
    const sector = p.sector ?? 'Unknown'
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + p.currentValue)
  }
  const sectorPieData = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
            className={`text-2xl font-bold ${portfolio.totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
              }`}
          >
            {formatCurrency(portfolio.totalUnrealizedPnL)} ({formatPercent(portfolio.totalUnrealizedPnLPercent)})
          </div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Predictions (est.)</div>
          <div className="text-2xl font-bold">{formatCurrency(portfolio.predictionPositionsValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">Valued at last traded price, open markets</div>
        </div>
      </div>

      {/* Portfolio value over time */}
      <div className="border rounded-lg p-4 mb-8">
        <h2 className="text-xl font-semibold mb-1">Portfolio value over time</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Starts at your opening balance; updates after each trade and at the current moment.
          Between trades the level stays flat until the next trade.
        </p>
        {history && history.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={history.map((p) => ({
                t: new Date(p.at).getTime(),
                value: p.value,
              }))}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <defs>
                <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) =>
                  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(v)
                }
                width={72}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(typeof value === "number" ? value : Number(value) || 0)
                }
                labelFormatter={(label) =>
                  typeof label === "number"
                    ? new Date(label).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : String(label)
                }
                contentStyle={{ borderRadius: "8px" }}
              />
              <Area
                type="stepAfter"
                dataKey="value"
                stroke="rgb(59, 130, 246)"
                strokeWidth={2}
                fill="url(#portfolioValueFill)"
                dot={{ r: 3, fill: "rgb(59, 130, 246)" }}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center px-4">
            <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
              {DATA_UNAVAILABLE.portfolioHistory}
            </p>
          </div>
        )}
      </div>

      {/* Position Sizes Pie Chart */}
      <div className="border rounded-lg p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">Allocation</h2>
        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center px-4">
            <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
              {DATA_UNAVAILABLE.portfolioAllocation}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  formatCurrency(typeof value === "number" ? value : Number(value) || 0)
                }
                contentStyle={{ borderRadius: "8px" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sector allocation pie chart */}
      <div className="border rounded-lg p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">Sector allocation</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Breakdown of your current investments by sector.
        </p>
        {sectorPieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center px-4">
            <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
              {portfolio.positions.length === 0
                ? DATA_UNAVAILABLE.portfolioPositions
                : DATA_UNAVAILABLE.portfolioSector}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
              >
                {sectorPieData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  formatCurrency(typeof value === "number" ? value : Number(value) || 0)
                }
                contentStyle={{ borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Prediction Market Positions */}
      {marketPositions.length > 0 && (
        <div className="border rounded-lg overflow-hidden mb-8">
          <h2 className="text-xl font-semibold p-4 border-b">Prediction Markets</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Market</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">YES Shares</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">NO Shares</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {marketPositions.map(pos => {
                  const resolved = pos.market.status === 'RESOLVED'
                  const payout = resolved
                    ? pos.market.outcome
                      ? formatCurrency(pos.yesQuantity)
                      : formatCurrency(pos.noQuantity)
                    : '—'
                  return (
                    <tr key={pos.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{pos.market.title}</td>
                      <td className="px-4 py-3">
                        <span className={pos.yesQuantity > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                          {pos.yesQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={pos.noQuantity > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                          {pos.noQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${pos.market.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : pos.market.status === 'RESOLVED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {pos.market.status}{pos.market.outcome != null && ` — ${pos.market.outcome ? 'YES' : 'NO'}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-600">{payout}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Positions Table */}
      <div className="border rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b">Positions</h2>
        {portfolio.positions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {DATA_UNAVAILABLE.portfolioPositions}
          </div>
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
                      className={`px-4 py-3 font-medium ${position.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
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

