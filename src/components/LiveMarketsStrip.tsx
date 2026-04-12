"use client"

import { useLiveQuotesStream } from "@/hooks/useLiveQuotesStream"
import { DEFAULT_LIVE_MARKETS_SYMBOLS } from "@/lib/live-markets-symbols"
import { DATA_UNAVAILABLE, softenPublicErrorMessage } from "@/lib/userFacingMessages"

const SYMBOLS = [...DEFAULT_LIVE_MARKETS_SYMBOLS]

function stripMessage(error: string | null): string {
  if (error?.trim()) return softenPublicErrorMessage(error.trim())
  return "Live prices aren’t available right now. Try again in a moment."
}

export function LiveMarketsStrip() {
  const { quotes, loading, error } = useLiveQuotesStream(SYMBOLS)

  const hasLiveData = quotes.length > 0
  const isLoadingMode = loading && !hasLiveData
  const isLiveMode = hasLiveData
  const isMessageMode = !isLiveMode && !isLoadingMode

  return (
    <div className="border-b bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 text-sm">
        <span className="shrink-0 font-medium text-muted-foreground">Live</span>

        {isLiveMode ? (
          <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-1">
            {quotes.map((q) => (
              <div
                key={q.symbol}
                className="flex shrink-0 items-center gap-2 rounded px-2 py-0.5 font-mono"
                title={
                  q.change == null || q.percentChange == null
                    ? DATA_UNAVAILABLE.changeVsClose
                    : undefined
                }
              >
                <span className="font-semibold">{q.symbol}</span>
                <span>${q.price.toFixed(2)}</span>
                {q.change != null ? (
                  <span
                    className={
                      q.change >= 0 ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    {q.change >= 0 ? "+" : ""}
                    {q.change.toFixed(2)} (
                    {q.percentChange != null
                      ? (q.percentChange >= 0 ? "+" : "") + q.percentChange.toFixed(2)
                      : "—"}
                    %)
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs font-sans whitespace-nowrap">
                    Change n/a
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : isLoadingMode ? (
          <div className="flex min-w-0 flex-1 items-center py-1">
            <span className="text-muted-foreground animate-pulse">Loading prices…</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center py-1">
            <p className="text-muted-foreground text-center sm:text-left">
              {stripMessage(error)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
