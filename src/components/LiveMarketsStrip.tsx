"use client"

import { useLiveQuotes } from "@/hooks/useLiveQuotes"
import { DEFAULT_LIVE_MARKETS_SYMBOLS } from "@/lib/live-markets-symbols"

/** Poll interval for live prices (ms). */
const POLL_INTERVAL_MS = 3000

const SYMBOLS = [...DEFAULT_LIVE_MARKETS_SYMBOLS]

export function LiveMarketsStrip() {
  const { quotes, loading, error } = useLiveQuotes(SYMBOLS, POLL_INTERVAL_MS)

  if (error) {
    return (
      <div className="border-b bg-muted/30 px-4 py-2 text-center text-sm text-muted-foreground">
        Live prices unavailable. Set FINNHUB_API_KEY in .env for real-time data.
      </div>
    )
  }

  return (
    <div className="border-b bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-2 text-sm">
        <span className="shrink-0 font-medium text-muted-foreground">Live</span>
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-1">
          {loading && quotes.length === 0 ? (
            <span className="text-muted-foreground">Loading…</span>
          ) : (
            quotes.map((q) => (
              <div
                key={q.symbol}
                className="flex shrink-0 items-center gap-2 rounded px-2 py-0.5 font-mono"
              >
                <span className="font-semibold">{q.symbol}</span>
                <span>${q.price.toFixed(2)}</span>
                {q.change != null && (
                  <span
                    className={
                      q.change >= 0 ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    {q.change >= 0 ? "+" : ""}
                    {q.change.toFixed(2)} ({q.percentChange != null ? (q.percentChange >= 0 ? "+" : "") + q.percentChange.toFixed(2) : "—"}%)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
