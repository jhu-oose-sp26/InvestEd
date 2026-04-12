"use client"

import { useCallback, useEffect, useState } from "react"
import { usePaperTradingAuth } from "@/contexts/PaperTradingAuthContext"
import {
  PORTFOLIO_NEWS_CLIENT_POLL_MS,
  PORTFOLIO_NEWS_MAX_SYMBOLS,
} from "@/lib/portfolioNewsConstants"
import type { PortfolioNewsEntry } from "@/lib/types/portfolioNews"

function formatNewsTime(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function PortfolioNewsSidebar() {
  const { user, portfolioId, ready, sessionSyncing } = usePaperTradingAuth()
  const [items, setItems] = useState<PortfolioNewsEntry[]>([])
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!portfolioId) return
    setLoading(true)
    setError(null)
    setConfigError(null)
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/news`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = (await res.json()) as {
        items?: PortfolioNewsEntry[]
        symbols?: string[]
        error?: string
        hint?: string
      }
      if (res.status === 503) {
        setItems([])
        setSymbols([])
        setConfigError(data.hint ?? data.error ?? "News unavailable")
        return
      }
      if (!res.ok) {
        setItems([])
        setSymbols([])
        setError(data.error ?? "Could not load news")
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
      setSymbols(Array.isArray(data.symbols) ? data.symbols : [])
    } catch {
      setError("Could not load news")
      setItems([])
      setSymbols([])
    } finally {
      setLoading(false)
    }
  }, [portfolioId])

  useEffect(() => {
    if (!ready || sessionSyncing || !user || !portfolioId) return
    void load()
    const t = setInterval(() => void load(), PORTFOLIO_NEWS_CLIENT_POLL_MS)
    return () => clearInterval(t)
  }, [ready, sessionSyncing, user, portfolioId, load])

  if (!ready || sessionSyncing) {
    return (
      <div className="border-b p-4 lg:border-b-0">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="border-b p-4 lg:border-b-0">
        <h2 className="text-sm font-semibold tracking-tight">Your holdings news</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to see headlines for stocks you own.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-b lg:border-b-0">
      <div className="border-b bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Your holdings news</h2>
        <p className="text-xs text-muted-foreground">
          North American listings via Finnhub. Up to {PORTFOLIO_NEWS_MAX_SYMBOLS} tickers from your
          open positions. Refreshes about every {PORTFOLIO_NEWS_CLIENT_POLL_MS / 60_000} minutes.
        </p>
      </div>
      <div className="px-2 py-3">
        {configError && (
          <p className="px-2 text-sm text-muted-foreground">{configError}</p>
        )}
        {error && !configError && <p className="px-2 text-sm text-destructive">{error}</p>}
        {!configError && !error && symbols.length === 0 && !loading && (
          <p className="px-2 text-sm text-muted-foreground">
            Buy shares to see recent company headlines here.
          </p>
        )}
        {loading && items.length === 0 && !configError && !error && (
          <p className="px-2 text-sm text-muted-foreground">Loading headlines…</p>
        )}
        <ul className="space-y-1">
          {items.map((n) => (
            <li key={`${n.id}-${n.symbol}`}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/80"
              >
                <div className="flex items-start gap-2">
                  {n.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image}
                      alt=""
                      className="mt-0.5 size-10 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                      {n.symbol}
                    </span>
                    <p className="mt-1 text-sm font-medium leading-snug text-foreground">{n.headline}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[n.source, formatNewsTime(n.datetime)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
