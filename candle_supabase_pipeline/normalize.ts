import type { AlpacaBar } from '@alpaca-data-pipeline/alpacaBarsApi'
import type { FinnhubQuoteSnapshot } from '@finnhub-data-pipeline'
import type { CandleSource, MarketCandleRow, MarketQuoteSnapshotRow } from './types'

export function alpacaBarsToRows(symbol: string, bars: AlpacaBar[], source: CandleSource = 'alpaca'): MarketCandleRow[] {
  const sym = symbol.trim().toUpperCase()
  return bars.map((bar) => ({
    symbol: sym,
    bucket_start: new Date(bar.t).toISOString(),
    timeframe: '1Min',
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v != null ? Math.trunc(bar.v) : null,
    vwap: bar.vw != null ? bar.vw : null,
    trade_count: bar.n ?? null,
    source,
  }))
}

export function finnhubQuoteSnapshotToRow(snapshot: FinnhubQuoteSnapshot): MarketQuoteSnapshotRow {
  return {
    symbol: snapshot.symbol,
    observed_at: snapshot.observedAtIso,
    last_price: snapshot.lastPrice,
    day_open: snapshot.dayOpen,
    day_high: snapshot.dayHigh,
    day_low: snapshot.dayLow,
    prev_close: snapshot.prevClose,
    change_abs: snapshot.changeAbs,
    change_pct: snapshot.changePct,
    source: 'finnhub_quote',
  }
}
