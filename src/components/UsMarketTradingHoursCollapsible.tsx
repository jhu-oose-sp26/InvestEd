"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

const US_MARKET_CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

type UsMarketTradingHoursCollapsibleProps = {
  /** Prefix for `id` / `aria-controls` so multiple instances stay unique */
  idPrefix?: string
  /** Renders to the left of the toggle (e.g. page title); panel still opens full width below the row. */
  leading?: ReactNode
}

export function UsMarketTradingHoursCollapsible({
  idPrefix = "trade",
  leading,
}: UsMarketTradingHoursCollapsibleProps) {
  const [open, setOpen] = useState(false)
  const toggleId = `${idPrefix}-trading-hours-toggle`
  const panelId = `${idPrefix}-trading-hours-panel`

  const toggleButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      id={toggleId}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={
        open ? "Hide U.S. Stock Market Trading Hours" : "Show U.S. Stock Market Trading Hours"
      }
      onClick={() => setOpen((v) => !v)}
      className={
        leading
          ? "h-auto min-h-9 w-full justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold shadow-sm sm:mt-1 sm:w-full"
          : "h-auto min-h-9 w-full justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold shadow-sm sm:w-auto sm:min-w-[12.5rem]"
      }
    >
      <span className="text-foreground">U.S. Stock Market Trading Hours</span>
      {open ? (
        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </Button>
  )

  return (
    <div className="space-y-4">
      {leading ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">{leading}</div>
          <div className="w-full shrink-0 sm:w-auto sm:min-w-[12.5rem]">{toggleButton}</div>
        </div>
      ) : (
        toggleButton
      )}

      {open ? (
        <aside
          id={panelId}
          role="region"
          aria-labelledby={toggleId}
          className="w-full rounded-lg border bg-card px-4 py-4 text-sm shadow-sm sm:px-5"
        >
          <p className="text-xs text-muted-foreground mb-4">
            NYSE &amp; Nasdaq: EST. Extended hours vary by broker.
          </p>

          <div className="overflow-x-auto -mx-1 px-1">
            <div
              className="inline-block min-w-full rounded-lg border border-border bg-background"
              role="table"
              aria-label="Weekly trading calendar, EST"
            >
              <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center" role="row">
                {US_MARKET_CALENDAR_DAYS.map((d) => (
                  <div
                    key={d}
                    className="border-r border-border py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground last:border-r-0 sm:text-xs"
                    role="columnheader"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 text-center" role="row">
                {US_MARKET_CALENDAR_DAYS.map((d, i) => {
                  const weekday = i < 5
                  return (
                    <div
                      key={`reg-${d}`}
                      className="flex min-h-[4.5rem] flex-col justify-center gap-1 border-r border-border px-1 py-2.5 last:border-r-0 sm:min-h-[5rem] sm:px-2"
                      role="cell"
                    >
                      {weekday ? (
                        <>
                          <span className="text-[10px] font-medium uppercase text-muted-foreground sm:text-[11px]">
                            Regular
                          </span>
                          <span className="text-[11px] font-medium tabular-nums text-foreground sm:text-xs">
                            9:30a – 4:00p
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">Closed</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-7 border-t border-border bg-muted/20 text-center" role="row">
                {US_MARKET_CALENDAR_DAYS.map((d, i) => {
                  const weekday = i < 5
                  return (
                    <div
                      key={`ext-${d}`}
                      className="flex min-h-[3.5rem] flex-col justify-center gap-0.5 border-r border-border px-1 py-2 last:border-r-0 sm:px-2"
                      role="cell"
                    >
                      {weekday ? (
                        <>
                          <span className="text-[9px] font-medium uppercase text-muted-foreground sm:text-[10px]">
                            Extended
                          </span>
                          <span className="text-[10px] tabular-nums leading-tight text-muted-foreground sm:text-[11px]">
                            ~4:00a – ~8:00p
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/70">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground border-t border-border/60 pt-4">
            Check an official exchange calendar for full closure or short days before you trade.
          </p>
        </aside>
      ) : null}
    </div>
  )
}
