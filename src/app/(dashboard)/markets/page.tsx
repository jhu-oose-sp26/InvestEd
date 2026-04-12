"use client"

import { useEffect, useState } from "react"
import { useLiveQuotesStream } from "@/hooks/useLiveQuotesStream"
import type { LiveQuoteItem } from "@/hooks/useLiveQuotes"
import { DEFAULT_LIVE_MARKETS_SYMBOLS } from "@/lib/live-markets-symbols"
import { formatQuoteAge, formatQuoteLocalTime } from "@/lib/formatQuoteFreshness"
import { DATA_UNAVAILABLE, MARKETS_CELL_SHORT } from "@/lib/userFacingMessages"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

function CellExplain({ short, why }: { short: string; why: string }) {
  return (
    <span className="text-xs text-muted-foreground leading-snug block max-w-[11rem]" title={why}>
      {short}
    </span>
  )
}

function LastUpdatedCell({ q, nowMs }: { q: LiveQuoteItem; nowMs: number }) {
  const fromStream = q.webSocketUpdatedAt != null
  const servedMs = q.retrievedAtMs ?? q.timestamp
  const providerMs = q.timestamp
  const clock = formatQuoteLocalTime(servedMs)
  const age = formatQuoteAge(servedMs, nowMs)
  const providerClock = formatQuoteLocalTime(providerMs)
  const title = [
    DATA_UNAVAILABLE.lastUpdatedServedExplainer,
    `Refreshed at ${clock} (${age}).`,
    `Price time from market data: ${providerClock}.`,
    fromStream ? DATA_UNAVAILABLE.streamQuoteExplainer : DATA_UNAVAILABLE.snapshotQuoteExplainer,
    !fromStream ? DATA_UNAVAILABLE.marketCloseTimeExplainer : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="tabular-nums align-top" title={title}>
      <div className="text-foreground">{clock}</div>
      <div className="text-xs text-muted-foreground">{age}</div>
      <div className="text-[10px] text-muted-foreground/80 tabular-nums">Price time: {providerClock}</div>
      {fromStream ? (
        <div className="text-[10px] mt-0.5 font-medium text-muted-foreground/90 tracking-wide">
          Live trades
        </div>
      ) : null}
    </div>
  )
}

export default function MarketsPage() {
  const symbols = [...DEFAULT_LIVE_MARKETS_SYMBOLS]
  const { quotes, loading, error, refetch } = useLiveQuotesStream(symbols)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Markets</h1>
          <p className="text-muted-foreground text-sm">
            Prices update when new trades are available. Refresh to reload from scratch.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          className="shrink-0 self-start gap-2 rounded-lg shadow-sm sm:mt-1"
        >
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          Refresh now
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800 border border-red-200 text-sm">
          <p className="font-medium">Prices couldn’t load</p>
          <p className="mt-1">{error}</p>
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
              <th className="px-4 py-3 font-semibold">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((sym) => {
              const q = quotes.find((x) => x.symbol === sym)
              const rowLoading = loading && !q
              return (
                <tr key={sym} className="border-t">
                  <td className="px-4 py-3 font-semibold">{sym}</td>
                  <td className="px-4 py-3 font-mono align-top">
                    {q ? (
                      `$${q.price.toFixed(2)}`
                    ) : rowLoading ? (
                      <span className="text-muted-foreground animate-pulse">…</span>
                    ) : (
                      <CellExplain
                        short={error ? MARKETS_CELL_SHORT.priceSeeNotice : MARKETS_CELL_SHORT.price}
                        why={
                          error
                            ? `${DATA_UNAVAILABLE.marketPriceSeeNotice} ${error}`.trim()
                            : DATA_UNAVAILABLE.marketPriceRow
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono align-top">
                    {q?.change != null ? (
                      <span className={q.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {q.change >= 0 ? "+" : ""}
                        {q.change.toFixed(2)}
                      </span>
                    ) : rowLoading ? (
                      <span className="text-muted-foreground animate-pulse">…</span>
                    ) : q ? (
                      <CellExplain short={MARKETS_CELL_SHORT.change} why={DATA_UNAVAILABLE.changeVsClose} />
                    ) : (
                      <CellExplain
                        short={MARKETS_CELL_SHORT.change}
                        why={
                          error
                            ? DATA_UNAVAILABLE.marketPriceSeeNotice
                            : "Change appears after we have a price and a prior close to compare against."
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono align-top">
                    {q?.percentChange != null ? (
                      <span
                        className={q.percentChange >= 0 ? "text-emerald-600" : "text-red-600"}
                      >
                        {q.percentChange >= 0 ? "+" : ""}
                        {q.percentChange.toFixed(2)}%
                      </span>
                    ) : rowLoading ? (
                      <span className="text-muted-foreground animate-pulse">…</span>
                    ) : q ? (
                      <CellExplain short={MARKETS_CELL_SHORT.change} why={DATA_UNAVAILABLE.changeVsClose} />
                    ) : (
                      <CellExplain
                        short={MARKETS_CELL_SHORT.change}
                        why={
                          error
                            ? DATA_UNAVAILABLE.marketPriceSeeNotice
                            : "Percent change appears after we have a price and a prior close to compare against."
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm align-top">
                    {q ? (
                      <LastUpdatedCell q={q} nowMs={nowMs} />
                    ) : rowLoading ? (
                      <span className="text-muted-foreground animate-pulse">…</span>
                    ) : (
                      <CellExplain
                        short={MARKETS_CELL_SHORT.lastUpdated}
                        why={
                          error
                            ? DATA_UNAVAILABLE.marketPriceSeeNotice
                            : "When a price appears, this column shows when it was last refreshed and how long ago that was."
                        }
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        className="mt-6 max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground"
        role="note"
        aria-label="How last updated and price time work"
      >
        <p className="text-foreground/95">
          <span className="font-semibold text-foreground">Last updated:</span>
          <span className="text-muted-foreground"> when you last pulled quotes on this page.</span>
        </p>
        <p className="text-foreground/95">
          <span className="font-semibold text-foreground">Price time:</span>
          <span className="text-muted-foreground"> time printed with the quote (freshness).</span>
        </p>
      </div>
    </div>
  )
}
