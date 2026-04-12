"use client"

import { useCallback, useEffect, useState } from "react"
import type { LeaderboardEntry } from "@/types"
import type { StreakLeaderboardEntry } from "@/types/quiz"
import { usePaperTradingAuth } from "@/contexts/PaperTradingAuthContext"

type LeaderboardView = "portfolio" | "streaks"

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function LeaderboardPage() {
  const { user, ready } = usePaperTradingAuth()
  const [view, setView] = useState<LeaderboardView>("portfolio")
  const [portfolioEntries, setPortfolioEntries] = useState<LeaderboardEntry[] | null>(null)
  const [portfolioTotal, setPortfolioTotal] = useState(0)
  const [streakEntries, setStreakEntries] = useState<StreakLeaderboardEntry[] | null>(null)
  const [streakTotal, setStreakTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPortfolio = useCallback(async () => {
    const res = await fetch("/api/leaderboard")
    const data = (await res.json().catch(() => ({}))) as {
      entries?: LeaderboardEntry[]
      total?: number
      error?: string
    }
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not load portfolio leaderboard")
    }
    setPortfolioEntries(data.entries ?? [])
    setPortfolioTotal(typeof data.total === "number" ? data.total : (data.entries ?? []).length)
  }, [])

  const loadStreaks = useCallback(async () => {
    const res = await fetch("/api/leaderboard/streaks")
    const data = (await res.json().catch(() => ({}))) as {
      entries?: StreakLeaderboardEntry[]
      total?: number
      error?: string
    }
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not load streak leaderboard")
    }
    setStreakEntries(data.entries ?? [])
    setStreakTotal(typeof data.total === "number" ? data.total : (data.entries ?? []).length)
  }, [])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (view === "portfolio") {
          await loadPortfolio()
        } else {
          await loadStreaks()
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, view, loadPortfolio, loadStreaks])

  const tabBtn =
    "rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Leaderboards</h1>
      <p className="text-muted-foreground mb-8">
        Global rankings: paper portfolio value (live marks) and daily challenge streaks (UTC).
      </p>

      <div
        className="inline-flex rounded-lg border border-border bg-muted/40 p-1 mb-8"
        role="tablist"
        aria-label="Leaderboard type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "portfolio"}
          className={`${tabBtn} ${view === "portfolio" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setView("portfolio")}
        >
          Portfolio value
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "streaks"}
          className={`${tabBtn} ${view === "streaks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setView("streaks")}
        >
          Daily streaks
        </button>
      </div>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
      ) : view === "portfolio" ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-sm text-muted-foreground">
            {portfolioTotal} portfolio{portfolioTotal !== 1 ? "s" : ""} ranked by total value
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-16">#</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Portfolio</th>
                  <th className="px-4 py-3 font-medium text-right">Total value</th>
                </tr>
              </thead>
              <tbody>
                {(portfolioEntries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No portfolios yet.
                    </td>
                  </tr>
                ) : (
                  (portfolioEntries ?? []).map((row) => {
                    const isYou = user?.id === row.userId
                    return (
                      <tr
                        key={row.portfolioId}
                        className={`border-b border-border last:border-0 ${isYou ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.rank}</td>
                        <td className="px-4 py-3 font-medium">{row.displayName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.portfolioName}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatUsd(row.totalPortfolioValue)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-sm text-muted-foreground">
            {streakTotal} player{streakTotal !== 1 ? "s" : ""} ranked by current streak (all correct days)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-16">#</th>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium text-right">Current streak</th>
                </tr>
              </thead>
              <tbody>
                {(streakEntries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No players yet.
                    </td>
                  </tr>
                ) : (
                  (streakEntries ?? []).map((row) => {
                    const isYou = user?.id === row.userId
                    return (
                      <tr
                        key={row.userId}
                        className={`border-b border-border last:border-0 ${isYou ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.rank}</td>
                        <td className="px-4 py-3 font-medium">{row.displayName}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {row.currentStreak} day{row.currentStreak !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
