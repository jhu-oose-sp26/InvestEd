"use client"

import { useState, useEffect } from "react"
import { useLivePrice } from "@/hooks/useLivePrice"
import { TradeChart, HistoricalBar } from "@/components/ui/TradeChart"
import { DATA_UNAVAILABLE, softenPublicErrorMessage } from "@/lib/userFacingMessages"
import { UsMarketTradingHoursCollapsible } from "@/components/UsMarketTradingHoursCollapsible"

/** Local-timezone YYYY-MM-DD (the user's "today"), used only for the date-picker max. */
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/* ── Eastern-Time helpers ───────────────────────────────────────────────
 * US exchanges operate on America/New_York time (EST/EDT). All session
 * boundary logic must use ET regardless of the user's local timezone so
 * that the chart range sent to /api/bars is always valid.
 * ──────────────────────────────────────────────────────────────────────*/

const ET_TZ = "America/New_York"

/** YYYY-MM-DD in Eastern Time (handles EST ↔ EDT automatically). */
function etDateString(d: Date = new Date()): string {
  // 'en-CA' locale formats dates as YYYY-MM-DD
  return d.toLocaleDateString("en-CA", { timeZone: ET_TZ })
}

/**
 * Extract the ET wall-clock components for a given instant so we can
 * compare hours/minutes against session boundaries.
 */
function etParts(d: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0)
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"), // midnight edge
    minute: get("minute"),
    second: get("second"),
  }
}

/**
 * Build a UTC Date for a given ET wall-clock time on a specific calendar day.
 * E.g. `etWallClockToUTC("2026-06-25", 9, 30)` → the UTC instant when it is
 * 09:30 in New York on June 25.
 *
 * Strategy: construct a rough UTC guess, read back what ET says it is,
 * compute the offset, and adjust.
 */
function etWallClockToUTC(dateStr: string, hours: number, minutes: number): Date {
  const [y, m, day] = dateStr.split("-").map(Number)
  // Rough guess: assume ET ≈ UTC-5 (close enough to land on the right calendar day)
  const guess = new Date(Date.UTC(y, m - 1, day, hours + 5, minutes))
  // What ET wall-clock does this guess correspond to?
  const p = etParts(guess)
  // ET wall-clock of the guess
  const guessETMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  // Desired ET wall-clock
  const targetETMs = Date.UTC(y, m - 1, day, hours, minutes, 0)
  // Adjust: shift guess by the difference between target and actual ET
  return new Date(guess.getTime() + (targetETMs - guessETMs))
}

/** 09:30 ET on the given YYYY-MM-DD, returned as a UTC Date. */
function sessionOpenUTC(dateStr: string): Date {
  return etWallClockToUTC(dateStr, 9, 30)
}
/** 16:00 ET on the given YYYY-MM-DD, returned as a UTC Date. */
function sessionCloseUTC(dateStr: string): Date {
  return etWallClockToUTC(dateStr, 16, 0)
}

/**
 * The session is "live" only while *now* falls inside today's regular session
 * (09:30–16:00 ET). Outside that window — past trading hours, before the open,
 * weekends, or any past date — the day's data is complete and should render as
 * a finished historical session (no live candle).
 */
function isLiveSession(dateStr: string, now: Date = new Date()): boolean {
  if (dateStr !== etDateString(now)) return false
  const p = etParts(now)
  const etMinutes = p.hour * 60 + p.minute
  return etMinutes >= 9 * 60 + 30 && etMinutes < 16 * 60
}

/**
 * The most recent trading day that actually has data: today (ET) once its
 * session has opened, otherwise the previous weekday. This keeps the chart on
 * a real, finished session when the page is opened late at night or before the
 * bell, instead of requesting an empty/not-yet-started "today".
 */
function mostRecentTradingDate(now: Date = new Date()): string {
  const p = etParts(now)
  const etMinutes = p.hour * 60 + p.minute

  // If we haven't reached 09:30 ET today, step back a day.
  let d = new Date(now)
  if (etMinutes < 9 * 60 + 30) {
    d.setDate(d.getDate() - 1)
  }
  // Recalculate in ET after the potential shift
  let candidate = etDateString(d)
  // Parse that candidate into a Date to check day-of-week
  let cd = new Date(candidate + "T12:00:00Z") // noon UTC, safe for day-of-week
  // Skip weekends (markets closed). Holidays are not modeled.
  while (cd.getUTCDay() === 0 || cd.getUTCDay() === 6) {
    cd.setUTCDate(cd.getUTCDate() - 1)
    candidate = cd.toISOString().slice(0, 10)
  }
  return candidate
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
        // Market open at 09:30 ET (proper UTC instant via etWallClockToUTC).
        const start = sessionOpenUTC(selectedDate)
        // While the session is live, fetch up to now; otherwise (past trading hours,
        // before the open, weekends, or a past date) the day is complete, so request
        // the full session through the 16:00 ET close and render it as a historical day.
        const end = isLiveSession(selectedDate)
          ? new Date()
          : sessionCloseUTC(selectedDate)

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
