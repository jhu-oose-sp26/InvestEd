"use client"

import { useState, useEffect } from "react"
import { useLivePrice } from "@/hooks/useLivePrice"
import { TradeChart, HistoricalBar } from "@/components/ui/TradeChart"
import { DATA_UNAVAILABLE, softenPublicErrorMessage } from "@/lib/userFacingMessages"
import { UsMarketTradingHoursCollapsible } from "@/components/UsMarketTradingHoursCollapsible"

/** Local-timezone YYYY-MM-DD (the user's "today"), not the UTC date from toISOString(). */
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Regular US session bounds (local time) for the given day. */
function sessionOpen(dateStr: string): Date {
  return new Date(`${dateStr}T09:30:00`)
}
function sessionClose(dateStr: string): Date {
  return new Date(`${dateStr}T16:00:00`)
}

/**
 * The session is "live" only while *now* falls inside today's regular session
 * (09:30–16:00). Outside that window — past trading hours in the evening, the
 * early hours before the open, weekends, or any past date — the day's data is
 * complete and should render as a finished historical session (no live candle).
 */
function isLiveSession(dateStr: string, now: Date = new Date()): boolean {
  if (dateStr !== localDateString(now)) return false
  return now >= sessionOpen(dateStr) && now < sessionClose(dateStr)
}

/**
 * The most recent trading day that actually has data: today once its session has
 * opened, otherwise the previous weekday. This keeps the chart on a real, finished
 * session when the page is opened late at night or before the bell, instead of
 * requesting an empty/not-yet-started "today" (which errors as an invalid range).
 */
function mostRecentTradingDate(now: Date = new Date()): string {
  const d = new Date(now)
  // Before today's open there is no data for today yet — step back a day.
  if (now < sessionOpen(localDateString(now))) {
    d.setDate(d.getDate() - 1)
  }
  // Skip weekends (markets closed). Holidays are not modeled.
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  return localDateString(d)
}

export default function TradePage() {
  const [symbol, setSymbol] = useState("")
  const [symbolToLookup, setSymbolToLookup] = useState("")
  const [quantity, setQuantity] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(mostRecentTradingDate())

  const [historicalBars, setHistoricalBars] = useState<HistoricalBar[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyMessage, setHistoryMessage] = useState<string | null>(null)

  const { price: livePrice, loading: livePriceLoading, error: livePriceError, refetch: refetchPrice } = useLivePrice(symbolToLookup, 1000)

  // Fetch 4 hours of historical 15-minute bars when symbol is chosen
  useEffect(() => {
    if (!symbolToLookup) {
      setHistoricalBars([])
      setHistoryMessage(null)
      return
    }

    async function fetchHistory() {
      setHistoryLoading(true)
      setHistoryMessage(null)
      try {
        // Market open at 09:30 local/ET.
        const start = sessionOpen(selectedDate)
        // While the session is live, fetch up to now; otherwise (past trading hours,
        // before the open, weekends, or a past date) the day is complete, so request
        // the full session through the 16:00 close and render it as a historical day.
        const end = isLiveSession(selectedDate)
          ? new Date()
          : sessionClose(selectedDate)

        const res = await fetch(
          `/api/bars?symbol=${encodeURIComponent(symbolToLookup)}&start=${start.toISOString()}&end=${end.toISOString()}`
        )
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setHistoricalBars(Array.isArray(data.bars) ? data.bars : [])
          setHistoryMessage(null)
        } else {
          setHistoricalBars([])
          setHistoryMessage(
            typeof data?.error === "string"
              ? softenPublicErrorMessage(data.error)
              : DATA_UNAVAILABLE.chartNoBars,
          )
        }
      } catch (err) {
        console.error("Failed to fetch history:", err)
        setHistoricalBars([])
        setHistoryMessage(
          "We couldn’t load the chart. Check your internet connection and try again.",
        )
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
        setMessage({ type: "success", text: "Your trade was submitted successfully." })
        setSymbol("")
        setSymbolToLookup("")
        setQuantity("")
      } else {
        setMessage({
          type: "error",
          text: softenPublicErrorMessage(
            typeof data?.error === "string" ? data.error : "We couldn’t complete that trade. Please try again.",
          ),
        })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while executing the trade" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <UsMarketTradingHoursCollapsible
        leading={
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Trading Terminal</h1>
            <p className="text-muted-foreground text-sm">
              Look up a stock symbol to view its live chart and execute trades.
            </p>
          </div>
        }
      />

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
              max={localDateString()}
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
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {livePriceLoading && !livePrice && "Loading live price…"}
                {livePrice != null && (
                  <span className="text-foreground">
                    Live Price: <span className="font-bold text-lg">${livePrice.toFixed(2)}</span>
                  </span>
                )}
                {livePrice != null && livePriceError && (
                  <span className="block text-amber-700 text-xs font-normal mt-1 max-w-xl">
                    {DATA_UNAVAILABLE.livePriceStale}
                  </span>
                )}
                {!livePriceLoading && livePrice == null && livePriceError && (
                  <span className="text-red-600 text-sm block max-w-xl">
                    {softenPublicErrorMessage(livePriceError)}
                  </span>
                )}
                {!livePriceLoading && livePrice == null && !livePriceError && (
                  <span className="text-muted-foreground text-sm block max-w-xl">
                    {DATA_UNAVAILABLE.livePriceNone}
                  </span>
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
                <p className="text-muted-foreground animate-pulse">Loading chart…</p>
              </div>
            ) : historyMessage && historicalBars.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center border rounded-xl bg-card px-4">
                <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                  {historyMessage}
                </p>
              </div>
            ) : (
              <TradeChart
                symbol={symbolToLookup}
                historicalBars={historicalBars}
                livePrice={isLiveSession(selectedDate) ? livePrice : null}
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

          </div>
        )}

        {/* Error / Success Messages */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-md font-medium ${message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
              }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
