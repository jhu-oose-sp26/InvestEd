"use client"

import type { OrderBookSnapshot, OrderBookEntry } from '@/types'

function PriceLevel({ entries, color, label }: { entries: (OrderBookEntry & { displayPrice: number })[]; color: 'emerald' | 'red'; label: string }) {
  const maxQty = Math.max(...entries.map(e => e.quantity), 1)
  const bg = color === 'emerald' ? 'bg-emerald-500/10' : 'bg-red-500/10'
  const text = color === 'emerald' ? 'text-emerald-600' : 'text-red-600'

  return (
    <div>
      <div className="flex justify-between font-medium text-muted-foreground mb-1">
        <span>{label}</span><span>Qty</span>
      </div>
      {entries.length === 0 && <p className="text-muted-foreground">None</p>}
      {entries.slice(0, 10).map((e, i) => (
        <div key={i} className="flex justify-between relative py-0.5">
          <div className={`absolute inset-0 ${bg} rounded`} style={{ width: `${(e.quantity / maxQty) * 100}%` }} />
          <span className={`relative ${text} font-mono`}>{(e.displayPrice * 100).toFixed(1)}&cent;</span>
          <span className="relative font-mono">{e.quantity}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  orderBook: OrderBookSnapshot | null
  loading: boolean
  mode: 'YES' | 'NO'
}

export function OrderBook({ orderBook, loading, mode }: Props) {
  if (loading && !orderBook) return <p className="text-sm text-muted-foreground animate-pulse">Loading order book...</p>
  if (!orderBook) return null

  // In YES mode: 
  //   Bids = Buy YES orders (yesBids).
  //   Asks = Sell YES orders (noBids).
  // In NO mode:
  //   Bids = Buy NO orders (noBids). Price displayed = 1 - YES price.
  //   Asks = Sell NO orders (yesBids). Price displayed = 1 - YES price.
  const bids = mode === 'YES' 
    ? orderBook.yesBids.map(e => ({ ...e, displayPrice: e.price }))
    : orderBook.noBids.map(e => ({ ...e, displayPrice: 1 - e.price }))

  const asks = mode === 'YES'
    ? orderBook.noBids.map(e => ({ ...e, displayPrice: e.price }))
    : orderBook.yesBids.map(e => ({ ...e, displayPrice: 1 - e.price }))

  return (
    <div className="border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Order Book ({mode})</h3>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <PriceLevel entries={bids} color="emerald" label={`${mode} Bids`} />
        <PriceLevel entries={asks} color="red" label={`${mode} Asks`} />
      </div>
    </div>
  )
}
