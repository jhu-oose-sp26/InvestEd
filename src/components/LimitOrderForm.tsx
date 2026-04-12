"use client"

import { useState } from 'react'

interface Props {
  marketId: string
  userId?: string
  onOrderPlaced?: () => void
}

export function LimitOrderForm({ marketId, userId = 'temp-user-id', onOrderPlaced }: Props) {
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [orderType, setOrderType] = useState<'LIMIT' | 'IOC'>('LIMIT')
  const [limitPrice, setLimitPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/limit-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, side, orderType, limitPrice: parseFloat(limitPrice), quantity: parseInt(quantity), userId }),
      })
      const data = await res.json()
      if (res.ok) {
        const matchedMsg = data.filled > 0 ? ` ${data.filled} orders matched!` : orderType === 'IOC' ? ' No match — cancelled.' : ''
        setMessage({ type: 'success', text: `Order placed.${matchedMsg}` })
        setLimitPrice('')
        setQuantity('')
        onOrderPlaced?.()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to place order' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to place order' })
    } finally {
      setLoading(false)
    }
  }

  const price = parseFloat(limitPrice)
  const valid = price > 0 && price <= 1 && quantity && parseInt(quantity) > 0

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">Place Order</h3>

      {/* Side */}
      <div className="flex gap-2">
        <button onClick={() => setSide('YES')}
          className={`flex-1 py-1.5 rounded text-sm font-bold ${side === 'YES' ? 'bg-emerald-600 text-white' : 'border'}`}>
          Buy YES
        </button>
        <button onClick={() => setSide('NO')}
          className={`flex-1 py-1.5 rounded text-sm font-bold ${side === 'NO' ? 'bg-red-600 text-white' : 'border'}`}>
          Buy NO
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-2">
        <button onClick={() => setOrderType('LIMIT')}
          className={`flex-1 py-1 rounded text-xs font-medium ${orderType === 'LIMIT' ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'}`}>
          Limit
        </button>
        <button onClick={() => setOrderType('IOC')}
          className={`flex-1 py-1 rounded text-xs font-medium ${orderType === 'IOC' ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'}`}>
          Immediate or Cancel
        </button>
      </div>
      {orderType === 'IOC' && (
        <p className="text-xs text-muted-foreground">Fills immediately if a matching order exists, otherwise cancelled.</p>
      )}

      <div>
        <label className="text-xs text-muted-foreground">
          {side === 'YES' ? 'Max price to pay (0.01 – 1.00)' : 'Min price to accept for YES (0.01 – 1.00)'}
        </label>
        <input type="number" placeholder="e.g. 0.65" value={limitPrice}
          onChange={e => setLimitPrice(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm" min="0.01" max="1" step="0.01" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Quantity (shares)</label>
        <input type="number" placeholder="e.g. 10" value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm" min="1" />
      </div>

      {valid && (
        <p className="text-xs text-muted-foreground">
          {side === 'YES'
            ? `Cost: $${(price * parseInt(quantity)).toFixed(2)}`
            : `Collateral: $${((1 - price) * parseInt(quantity)).toFixed(2)} (max loss if YES wins)`}
        </p>
      )}
      {limitPrice && (price <= 0 || price > 1) && (
        <p className="text-xs text-red-600">Price must be between 0.01 and 1.00</p>
      )}

      <button onClick={handleSubmit} disabled={loading || !valid}
        className={`w-full py-2 rounded font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed ${side === 'YES' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
        {loading ? 'Placing...' : `Buy ${side} @ ${limitPrice || '—'}`}
      </button>

      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
      )}
    </div>
  )
}
