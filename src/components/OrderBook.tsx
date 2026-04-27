"use client"

import type { OrderBookSnapshot, OrderBookEntry } from '@/types'

function PriceLevel({ entries, color, label }: { entries: OrderBookEntry[]; color: 'emerald' | 'red'; label: string }) {
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
          <span className={`relative ${text} font-mono`}>{(e.price * 100).toFixed(1)}&cent;</span>
          <span className="relative font-mono">{e.quantity}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  orderBook: OrderBookSnapshot | null
  loading: boolean
}

export function OrderBook({ orderBook, loading }: Props) {
  if (loading && !orderBook) return <p className="text-sm text-muted-foreground animate-pulse">Loading order book...</p>
  if (!orderBook) return null

  return (
    <div className="border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Order Book</h3>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <PriceLevel entries={orderBook.yesBids} color="emerald" label="YES Bids" />
        <PriceLevel entries={orderBook.noBids} color="red" label="YES Asks" />
      </div>
    </div>
  )
}
