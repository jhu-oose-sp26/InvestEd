"use client"

import { useEffect, useRef } from "react"
import { createChart, ColorType, ISeriesApi, CandlestickData, Time } from "lightweight-charts"

export interface HistoricalBar {
  t: string // ISO timestamp
  o: number
  h: number
  l: number
  c: number
  v?: number | null
  vw?: number | null
  n?: number | null
}

interface TradeChartProps {
  symbol: string
  historicalBars: HistoricalBar[]
  livePrice: number | null
}

/** Shift a UTC unix-seconds timestamp so lightweight-charts renders it as local time. */
function toLocalChartTime(utcSeconds: number): Time {
  const offsetSeconds = new Date(utcSeconds * 1000).getTimezoneOffset() * 60
  return (utcSeconds - offsetSeconds) as Time
}

export function TradeChart({ symbol, historicalBars, livePrice }: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const chartRef = useRef<any>(null)
  // Tracks the accumulated OHLC for the current live candle so we don't lose high/low across ticks
  const liveCandleRef = useRef<{ intervalUnix: number; open: number; high: number; low: number; close: number } | null>(null)

  // 1) Initialize Chart and Base Data
  useEffect(() => {
    if (!chartContainerRef.current) return

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(100, 100, 100, 0.1)" },
        horzLines: { color: "rgba(100, 100, 100, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })
    
    chartRef.current = chart

    // Create Candlesticks
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",     // emerald
      downColor: "#ef4444",   // red
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })
    seriesRef.current = candlestickSeries

    // Load initial data
    if (historicalBars.length > 0) {
      const formattedBars: CandlestickData[] = historicalBars.map((b) => ({
        time: toLocalChartTime(Math.floor(new Date(b.t).getTime() / 1000)),
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
      }))
      // Sort and deduplicate by time to prevent lightweight-chart errors
      const uniqueBarsMap = new Map<number, CandlestickData>()
      for (const bar of formattedBars) {
        uniqueBarsMap.set(bar.time as number, bar)
      }
      const uniqueSorted = Array.from(uniqueBarsMap.values()).sort((a, b) => (a.time as number) - (b.time as number))
      candlestickSeries.setData(uniqueSorted)
    }

    chart.timeScale().fitContent()

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [historicalBars])

  // 2) Live Finnhub Update tick
  useEffect(() => {
    if (!seriesRef.current || !historicalBars.length || livePrice == null) return

    const lastBarOrigin = historicalBars[historicalBars.length - 1]
    const lastBarTimeUnix = Math.floor(new Date(lastBarOrigin.t).getTime() / 1000)

    const now = new Date()
    // Current unfinalized 15-minute interval marker
    const currentMinStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() - (now.getMinutes() % 15), 0)
    const currentMinUnix = Math.floor(currentMinStart.getTime() / 1000)

    let updateData: CandlestickData

    if (currentMinUnix > lastBarTimeUnix) {
      // The current time has rolled over into a new 15-minute chunk that hasn't arrived via historicals yet.
      const liveCandle = liveCandleRef.current

      if (!liveCandle || liveCandle.intervalUnix !== currentMinUnix) {
        // First tick in a new interval — initialize the candle
        liveCandleRef.current = {
          intervalUnix: currentMinUnix,
          open: lastBarOrigin.c,
          high: Math.max(lastBarOrigin.c, livePrice),
          low: Math.min(lastBarOrigin.c, livePrice),
          close: livePrice,
        }
      } else {
        // Subsequent tick — accumulate high/low
        liveCandle.high = Math.max(liveCandle.high, livePrice)
        liveCandle.low = Math.min(liveCandle.low, livePrice)
        liveCandle.close = livePrice
      }

      const c = liveCandleRef.current!
      updateData = {
        time: toLocalChartTime(currentMinUnix),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }
    } else {
       // Our live tick is inside the very last historical bar's interval.
       // Anchor to the historical OHLC (already finalized high/low) and extend with live price.
       updateData = {
         time: toLocalChartTime(lastBarTimeUnix),
         open: lastBarOrigin.o,
         high: Math.max(lastBarOrigin.h, livePrice),
         low: Math.min(lastBarOrigin.l, livePrice),
         close: livePrice,
       }
    }

    try {
      seriesRef.current.update(updateData)
    } catch (e) {
      console.warn("Chart append error", e)
    }

  }, [livePrice, historicalBars])

  return (
    <div className="w-full flex-col flex space-y-2 border rounded-xl overflow-hidden p-4 bg-card/50">
      <div className="flex justify-between items-center text-sm px-2">
        <span className="font-semibold text-muted-foreground">{symbol.toUpperCase()} Candlestick History</span>
        <span className="font-medium">15M Interval</span>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}
