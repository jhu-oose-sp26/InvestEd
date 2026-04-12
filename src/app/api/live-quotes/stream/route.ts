/**
 * GET /api/live-quotes/stream?symbols=AAPL,MSFT
 * Server-Sent Events: initial snapshot (one getLiveQuotes) then push on Finnhub WebSocket cache updates.
 * Reduces repeated REST polling from the browser; trades feel immediate when the stream is active.
 */

import { NextRequest } from 'next/server'
import { getLiveQuotes } from '@/features/market-data/finnhub'
import { getCachedQuote, subscribeToQuoteCacheUpdates } from '@/features/market-data/finnhub/finnhubWebSocketClient'
import { enrichQuoteWithDerivedChange } from '@/features/market-data/finnhub/referenceCloseCache'
import type { FinnhubLiveQuote } from '@/features/market-data/finnhub/types'
import { httpErrorResponse } from '@/lib/api/httpErrors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Long-lived SSE; raise on hosts that support it (e.g. Vercel Pro). */
export const maxDuration = 300

function withRetrievedAt(q: FinnhubLiveQuote): FinnhubLiveQuote {
  return { ...q, retrievedAtMs: Date.now() }
}

function quoteFromCache(sym: string): FinnhubLiveQuote | null {
  const c = getCachedQuote(sym)
  if (!c) return null
  return withRetrievedAt(enrichQuoteWithDerivedChange({ ...c }))
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols')
  const raw = symbolsParam?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  if (raw.length === 0) {
    return httpErrorResponse('IE_VAL_005', 400)
  }
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey?.trim()) {
    return httpErrorResponse('IE_CFG_001', 503)
  }

  const order = [...new Set(raw.map((s) => s.toUpperCase()))]

  const encoder = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let unsub: () => void = () => {}

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const safeSend = (quotes: FinnhubLiveQuote[]) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(quotes)}\n\n`))
      }

      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'))
      }, 20000)

      try {
        let initial = await getLiveQuotes(order, apiKey)
        if (initial.length === 0 && order.length > 0) {
          await new Promise((r) => setTimeout(r, 600))
          initial = await getLiveQuotes(order, apiKey)
        }
        const last = new Map<string, FinnhubLiveQuote>()
        for (const q of initial) {
          last.set(q.symbol.toUpperCase(), q)
        }

        const buildList = (): FinnhubLiveQuote[] => {
          const out: FinnhubLiveQuote[] = []
          for (const sym of order) {
            const row = last.get(sym)
            if (row) out.push(row)
          }
          return out
        }

        safeSend(buildList())

        unsub = subscribeToQuoteCacheUpdates((updated) => {
          const orderSet = new Set(order)
          const updatedSet = new Set(updated.map((u) => u.toUpperCase()))
          const hit = [...updatedSet].some((s) => orderSet.has(s))
          if (!hit) return
          for (const s of order) {
            if (!updatedSet.has(s)) continue
            const q = quoteFromCache(s)
            if (q) last.set(s, q)
          }
          safeSend(buildList())
        })
      } catch (e) {
        console.error('live-quotes stream init error:', e)
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        heartbeat = null
        unsub()
        unsub = () => {}
        controller.error(e)
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      unsub()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
