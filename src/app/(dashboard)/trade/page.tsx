"use client"

import { useState, useEffect } from "react"
import { useLivePrice } from "@/hooks/useLivePrice"
import { TradeChart, HistoricalBar } from "@/components/ui/TradeChart"

export default function TradePage() {
  const [symbol, setSymbol] = useState("")
  const [symbolToLookup, setSymbolToLookup] = useState("")
  const [quantity, setQuantity] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])

  const [historicalBars, setHistoricalBars] = useState<HistoricalBar[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Polling every 1s for the "fat moving point" live chart action
  const { price: livePrice, loading: livePriceLoading, error: livePriceError, refetch: refetchPrice } = useLivePrice(symbolToLookup, 1000)

  // Fetch 4 hours of historical 15-minute bars when symbol is chosen
  useEffect(() => {
    if (!symbolToLookup) {
      setHistoricalBars([])
      return
    }

    async function fetchHistory() {
      setHistoryLoading(true)
      try {
        const isToday = selectedDate === new Date().toISOString().split("T")[0]
        let start: Date
        let end: Date
        if (isToday) {
          end = new Date()
          start = new Date(`${selectedDate}T09:30:00`)
        } else {
          // If a past date is selected, assume market close at 16:00 local/ET
          end = new Date(`${selectedDate}T16:00:00`)
          // Market open at 09:30 local/ET
          start = new Date(`${selectedDate}T09:30:00`)
        }

        const res = await fetch(
          `/api/bars?symbol=${encodeURIComponent(symbolToLookup)}&start=${start.toISOString()}&end=${end.toISOString()}`
        )
        if (res.ok) {
          const data = await res.json()
          setHistoricalBars(data.bars || [])
        } else {
          setHistoricalBars([])
        }
      } catch (err) {
        console.error("Failed to fetch history:", err)
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [symbolToLookup, selectedDate])

  const handleTrade = async (tradeType: "BUY" | "SELL") => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbolToLookup.toUpperCase(),
          type: tradeType,
          quantity: parseInt(quantity),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: `Trade executed successfully! Trade ID: ${data.tradeId}` })
        setSymbol("")
        setSymbolToLookup("")
        setQuantity("")
      } else {
        setMessage({ type: "error", text: data.error || "Failed to execute trade" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while executing the trade" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Live Trading Terminal</h1>
        <p className="text-muted-foreground text-sm">
          Look up a stock symbol to view its live chart and execute trades.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="symbol" className="block text-sm font-medium mb-2">
              Stock Symbol
            </label>
            <input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase())
                setSymbolToLookup("") // Reset the active lookup when typing
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const sym = symbol.trim().toUpperCase()
                  if (sym) setSymbolToLookup(sym)
                }
              }}
              placeholder="e.g., AAPL (press Enter to look up)"
              className="w-full px-4 py-2 border rounded-md"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Trading Date
            </label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:max-w-xs px-4 py-2 border rounded-md"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div>
          {symbol.trim() && !symbolToLookup && (
            <p className="mt-2 text-sm text-amber-600 font-medium">
              Press Enter to load the chart and live price.
            </p>
          )}

          {symbolToLookup && (
            <div className="mt-3 flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {livePriceLoading && !livePrice && "Loading live price…"}
                {livePrice != null && (
                  <span className="text-foreground">
                    Live Price: <span className="font-bold text-lg">${livePrice.toFixed(2)}</span>
                    {livePriceError && " (stale)"}
                  </span>
                )}
                {!livePriceLoading && livePrice == null && livePriceError && (
                  <span className="text-red-600">Failed to get quote: {livePriceError}</span>
                )}
                {!livePriceLoading && livePrice == null && !livePriceError && (
                  <span className="text-muted-foreground">No price found for {symbolToLookup}.</span>
                )}
              </p>
            </div>
          )}
        </div>

        {symbolToLookup && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Chart Area */}
            {historyLoading && historicalBars.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center border rounded-xl bg-card">
                <p className="text-muted-foreground animate-pulse">Fetching candlestick history...</p>
              </div>
            ) : (
              <TradeChart
                symbol={symbolToLookup}
                historicalBars={historicalBars}
                livePrice={selectedDate === new Date().toISOString().split("T")[0] ? livePrice : null}
              />
            )}

            {/* Trading Actions */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Execute Order</h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="quantity" className="block text-sm font-medium mb-2">
                    Quantity (Shares)
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    className="w-full px-4 py-3 border rounded-md text-lg"
                    required
                  />
                </div>

                <div className="flex-1 flex gap-3 items-end">
                  <button
                    type="button"
                    onClick={() => handleTrade("BUY")}
                    disabled={loading || !quantity || parseInt(quantity) <= 0 || !livePrice}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrade("SELL")}
                    disabled={loading || !quantity || parseInt(quantity) <= 0 || !livePrice}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>

            {/* Error / Success Messages */}
            {message && (
              <div
                className={`p-4 rounded-md font-medium ${message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                  }`}
              >
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
