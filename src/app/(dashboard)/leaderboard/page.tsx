"use client"

import { useCallback, useEffect, useState } from "react"
import { Flame, Loader2, Trophy, Wallet } from "lucide-react"
import type { LeaderboardEntry } from "@/types"
import type { StreakLeaderboardEntry } from "@/types/quiz"
import { usePaperTradingAuth } from "@/contexts/PaperTradingAuthContext"
import { cn } from "@/lib/utils"

type LeaderboardView = "portfolio" | "dailyChallenge"

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function RankCell({ rank }: { rank: number }) {
  const top = rank <= 3
  const styles =
    rank === 1
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/25"
      : rank === 2
        ? "bg-zinc-400/15 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-400/20"
        : rank === 3
          ? "bg-orange-600/12 text-orange-900 dark:text-orange-300 ring-1 ring-orange-500/20"
          : ""

  return (
    <td className="px-4 py-3.5 sm:px-5">
      {top ? (
        <span
          className={cn(
            "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums",
            styles
          )}
        >
          {rank}
        </span>
      ) : (
        <span className="inline-flex h-8 min-w-8 items-center justify-center text-sm tabular-nums text-muted-foreground">
          {rank}
        </span>
      )}
    </td>
  )
}

export default function LeaderboardPage() {
  const { user, ready } = usePaperTradingAuth()
  const [view, setView] = useState<LeaderboardView>("portfolio")
  const [portfolioEntries, setPortfolioEntries] = useState<LeaderboardEntry[] | null>(null)
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

  const tabClass = (active: boolean) =>
    cn(
      "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-initial sm:min-w-[10rem]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      active
        ? "bg-card text-foreground shadow-md shadow-black/5 ring-1 ring-border/60 dark:shadow-black/20"
        : "text-muted-foreground hover:text-foreground"
    )

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-blue-500/[0.06] via-card to-muted/30 px-6 py-8 shadow-sm sm:px-10 sm:py-9 dark:from-blue-500/10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/15"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-inner dark:bg-blue-500/15 dark:text-blue-400">
            <Trophy className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Leaderboards</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">See how you stack up across the community.</p>
          </div>
        </div>
      </header>

      <div
        className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 p-1.5 shadow-inner sm:inline-flex sm:flex-row"
        role="tablist"
        aria-label="Leaderboard type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "portfolio"}
          className={tabClass(view === "portfolio")}
          onClick={() => setView("portfolio")}
        >
          <Wallet className="h-4 w-4 opacity-80" aria-hidden />
          Portfolio value
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "dailyChallenge"}
          className={tabClass(view === "dailyChallenge")}
          onClick={() => setView("dailyChallenge")}
        >
          <Flame className="h-4 w-4 opacity-80" aria-hidden />
          Daily challenge
        </button>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Getting ready…
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">Loading rankings…</p>
        </div>
      ) : view === "portfolio" ? (
        <section className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-blue-500/20" />
          <div className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Portfolios ranked by total value.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Rank
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Trader
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Portfolio
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Total value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(portfolioEntries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-muted-foreground">
                      No portfolios yet. Be the first on the board.
                    </td>
                  </tr>
                ) : (
                  (portfolioEntries ?? []).map((row) => {
                    const isYou = user?.id === row.userId
                    return (
                      <tr
                        key={row.portfolioId}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isYou && "bg-primary/[0.06] ring-1 ring-inset ring-primary/15"
                        )}
                      >
                        <RankCell rank={row.rank} />
                        <td className="px-4 py-3.5 font-medium text-foreground sm:px-5">
                          {row.displayName}
                          {isYou ? (
                            <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                              You
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground sm:px-5">{row.portfolioName}</td>
                        <td className="px-4 py-3.5 text-right text-base font-semibold tabular-nums text-foreground sm:px-5">
                          {formatUsd(row.totalPortfolioValue)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-orange-500/15" />
          <div className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Daily challenge</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {streakTotal} player{streakTotal !== 1 ? "s" : ""} by current streak (all-correct days, UTC).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Rank
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Trader
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                    Challenge streak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(streakEntries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center text-muted-foreground">
                      No streaks yet. Play the daily challenge to appear here.
                    </td>
                  </tr>
                ) : (
                  (streakEntries ?? []).map((row) => {
                    const isYou = user?.id === row.userId
                    return (
                      <tr
                        key={row.userId}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isYou && "bg-primary/[0.06] ring-1 ring-inset ring-primary/15"
                        )}
                      >
                        <RankCell rank={row.rank} />
                        <td className="px-4 py-3.5 font-medium text-foreground sm:px-5">
                          {row.displayName}
                          {isYou ? (
                            <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                              You
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 text-right sm:px-5">
                          <span className="inline-flex min-w-[4.5rem] justify-end text-base font-semibold tabular-nums text-foreground">
                            {row.currentStreak}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              day{row.currentStreak !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
