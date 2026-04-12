"use client"

import { useMemo } from "react"
import { useLiveQuotesStream } from "@/hooks/useLiveQuotesStream"
import { DEFAULT_LIVE_MARKETS_SYMBOLS } from "@/lib/live-markets-symbols"

/** Subset keeps the landing request light; strip still matches your watchlist names. */
const TICKER_SYMBOLS = [...DEFAULT_LIVE_MARKETS_SYMBOLS].slice(0, 14)

function TickerItem({
  symbol,
  price,
  change,
}: {
  symbol: string
  price: number | null
  change: number | null
}) {
  const up = change != null && change >= 0
  return (
    <span className="inline-flex items-center gap-2 border-r border-border/60 px-5 py-1 font-mono text-sm tabular-nums last:border-r-0">
      <span className="font-semibold text-foreground">{symbol}</span>
      {price != null ? (
        <>
          <span className="text-foreground">${price.toFixed(2)}</span>
          {change != null ? (
            <span className={up ? "text-emerald-600" : "text-red-600"}>
              {up ? "+" : ""}
              {change.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">
          <span className="inline-block w-16 animate-pulse rounded bg-muted"> </span>
        </span>
      )}
    </span>
  )
}

export function LandingMarketTicker() {
  const { quotes } = useLiveQuotesStream(TICKER_SYMBOLS)
  const bySymbol = useMemo(() => new Map(quotes.map((q) => [q.symbol, q])), [quotes])

  const items = useMemo(
    () =>
      TICKER_SYMBOLS.map((sym) => {
        const q = bySymbol.get(sym)
        return {
          symbol: sym,
          price: q?.price ?? null,
          change: q?.change ?? null,
        }
      }),
    [bySymbol],
  )

  const row = (keyPrefix: string) => (
    <div className="flex shrink-0 items-stretch">
      {items.map((it) => (
        <TickerItem key={`${keyPrefix}-${it.symbol}`} {...it} />
      ))}
    </div>
  )

  return (
    <div
      className="relative mt-10 w-[100vw] ml-[calc(50%-50vw)] overflow-hidden border-y border-border/60 bg-muted/20 py-2.5"
      aria-label="Market symbols and prices"
    >
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {row("a")}
        {row("b")}
      </div>
    </div>
  )
}
