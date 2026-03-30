/**
 * Finnhub WebSocket client for real-time trades.
 * wss://ws.finnhub.io – subscribe by symbol; cache updated on each trade message.
 * One connection per API key. Uses "ws" package (Node).
 */

import WebSocket from 'ws'
import type { FinnhubTradeMessage, FinnhubLiveQuote } from './types'
import { FINNHUB_WATCHLIST_SYMBOLS } from './watchlistSymbols'

const WS_URL = 'wss://ws.finnhub.io'
const quoteCache = new Map<string, FinnhubLiveQuote>()
const subscribedSymbols = new Set<string>()
let ws: WebSocket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT = 5
const RECONNECT_MS = 2000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function send(socket: WebSocket, payload: { type: string; symbol?: string }) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

function subscribe(socket: WebSocket, symbol: string) {
  const sym = symbol.toUpperCase()
  if (subscribedSymbols.has(sym)) return
  subscribedSymbols.add(sym)
  send(socket, { type: 'subscribe', symbol: sym })
}

function onMessage(data: Buffer | ArrayBuffer | Buffer[]) {
  try {
    const raw = Buffer.isBuffer(data) ? data.toString('utf8') : Array.isArray(data) ? Buffer.concat(data).toString('utf8') : String(data)
    const msg = JSON.parse(raw) as FinnhubTradeMessage
    if (msg.type !== 'trade' || !Array.isArray(msg.data)) return
    for (const item of msg.data) {
      const sym = (item.s ?? '').toUpperCase()
      if (!sym) continue
      quoteCache.set(sym, { symbol: sym, price: item.p, timestamp: item.t, volume: item.v })
    }
  } catch { /* ignore */ }
}

function connect(apiKey: string): WebSocket {
  const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(apiKey)}`)
  socket.on('open', () => {
    reconnectAttempts = 0
    subscribedSymbols.forEach((sym) => send(socket, { type: 'subscribe', symbol: sym }))
  })
  socket.on('message', onMessage)
  socket.on('close', () => {
    ws = null
    if (reconnectAttempts < MAX_RECONNECT)
      reconnectTimer = setTimeout(() => { reconnectAttempts++; reconnectTimer = null; ws = connect(apiKey) }, RECONNECT_MS)
  })
  return socket
}

/**
 * Register one symbol: add to subscription set and open socket if needed.
 * Does not close a CONNECTING socket (avoids breaking batch subscribe).
 */
export function ensureSubscribed(symbol: string, apiKey: string): void {
  if (!apiKey?.trim()) return
  const needNewSocket = !ws || ws.readyState === WebSocket.CLOSED
  if (needNewSocket) {
    if (ws) try { ws.close() } catch { /* ignore */ }
    ws = connect(apiKey)
  }
  subscribe(ws!, symbol)
}

/** Subscribe the full watchlist (idempotent). Call when serving live quotes so WS receives trades for all symbols. */
export function ensureWatchlistSubscribed(apiKey: string): void {
  if (!apiKey?.trim()) return
  for (const sym of FINNHUB_WATCHLIST_SYMBOLS) {
    ensureSubscribed(sym, apiKey)
  }
}

/** Current subscription set (for debugging / admin tools). */
export function getSubscribedSymbols(): string[] {
  return [...subscribedSymbols].sort()
}

export function getCachedQuote(symbol: string): FinnhubLiveQuote | null {
  return quoteCache.get(symbol.toUpperCase()) ?? null
}

export function closeWebSocket(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  if (ws) try { ws.close() } catch { /* ignore */ }
  ws = null
  subscribedSymbols.clear()
  quoteCache.clear()
  reconnectAttempts = MAX_RECONNECT
}
