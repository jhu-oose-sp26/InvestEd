"use client"

import type { LimitOrder } from '@/hooks/useLimitOrders'

interface Props {
  orders: LimitOrder[]
  onCancel: () => void
}

export function OpenOrders({ orders, onCancel }: Props) {
  const handleCancel = async (orderId: string) => {
    const res = await fetch('/api/limit-orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderId }),
    })
    if (res.ok) onCancel()
  }

  if (orders.length === 0) return null

  return (
    <div className="border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3">Your Orders</h3>
      <div className="space-y-2">
        {orders.map(o => (
          <div key={o.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
            <div>
              <span className={`font-bold ${o.side === 'YES' ? 'text-emerald-600' : 'text-red-600'}`}>{o.side}</span>
              {' '}<span className="font-medium">{o.market.title}</span>
              {' '}<span className="text-muted-foreground">{o.quantity} @ {(Number(o.limitPrice) * 100).toFixed(1)}&cent;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${o.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : o.status === 'FILLED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {o.status}
              </span>
              {o.status === 'OPEN' && (
                <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:text-red-700 font-medium">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
