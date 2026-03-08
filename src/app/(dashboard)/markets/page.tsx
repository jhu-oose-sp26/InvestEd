"use client"

import { useLiveQuotes } from "@/hooks/useLiveQuotes"
import { DEFAULT_LIVE_MARKETS_SYMBOLS } from "@/lib/live-markets-symbols"

const POLL_INTERVAL_MS = 3000

export default function MarketsPage() {
  const symbols = [...DEFAULT_LIVE_MARKETS_SYMBOLS]
  const { quotes, loading, error, refetch } = useLiveQuotes(symbols, POLL_INTERVAL_MS)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Live Markets</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Real-time prices update every {POLL_INTERVAL_MS / 1000}s. Requires FINNHUB_API_KEY in .env.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Symbol</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Change</th>
              <th className="px-4 py-3 font-semibold">% Change</th>
            </tr>
          </thead>
          <tbody>
            {loading && quotes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.symbol} className="border-t">
                  <td className="px-4 py-3 font-semibold">{q.symbol}</td>
                  <td className="px-4 py-3 font-mono">${q.price.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">
                    {q.change != null ? (
                      <span className={q.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {q.change >= 0 ? "+" : ""}{q.change.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {q.percentChange != null ? (
                      <span className={q.percentChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {q.percentChange >= 0 ? "+" : ""}{q.percentChange.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => refetch()}
        className="mt-4 text-sm font-medium text-primary hover:underline"
      >
        Refresh now
      </button>
    </div>
  )
}
