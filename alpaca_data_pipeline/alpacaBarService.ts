/**
 * Alpaca historical bar pipeline – TypeScript / Node.js
 *
 * Receives a ticker + timeframe (start/end), ensures the database has
 * 1-minute bars covering that interval.  If the interval reaches within
 * 15 minutes of the current time, those last 15 minutes are trimmed
 * (Alpaca bars are not yet finalised for that window).
 *
 * Usage from an API route:
 *   import { ensureBars } from '@alpaca-data-pipeline/alpacaBarService'
 *   await ensureBars('AAPL', new Date('2026-03-10'), new Date('2026-03-11'))
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALPACA_DATA_BASE = 'https://data.alpaca.markets/v2'
const BATCH_SIZE = 500
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

function getAlpacaHeaders(): Record<string, string> {
    const key = process.env.ALPAKA_API_KEY
    const secret = process.env.ALPAKA_API_SECRET
    if (!key || !secret) {
        throw new Error('ALPAKA_API_KEY and ALPAKA_API_SECRET must be set in environment')
    }
    return {
        'APCA-API-KEY-ID': key,
        'APCA-API-SECRET-KEY': secret,
        Accept: 'application/json',
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlpacaBar {
    t: string   // ISO timestamp
    o: number   // open
    h: number   // high
    l: number   // low
    c: number   // close
    v: number   // volume
    vw: number  // vwap
    n: number   // trade count
}

interface AlpacaBarsResponse {
    bars: AlpacaBar[]
    next_page_token: string | null
}

export interface EnsureBarsResult {
    symbol: string
    start: Date
    end: Date
    fetchedFromApi: number
    upsertedToDb: number
    skippedExisting: number
}

// ---------------------------------------------------------------------------
// Clamp helpers
// ---------------------------------------------------------------------------

/**
 * If `end` falls within 15 minutes of now, clamp it back so we never
 * request bars that Alpaca hasn't finalised yet.
 */
function clampEnd(end: Date): Date {
    const cutoff = new Date(Date.now() - FIFTEEN_MINUTES_MS)
    return end > cutoff ? cutoff : end
}

// ---------------------------------------------------------------------------
// Alpaca REST fetch (with pagination)
// ---------------------------------------------------------------------------

async function fetchBarsFromAlpaca(
    symbol: string,
    start: Date,
    end: Date,
): Promise<AlpacaBar[]> {
    const headers = getAlpacaHeaders()
    const allBars: AlpacaBar[] = []
    let pageToken: string | null = null

    do {
        const url = new URL(`${ALPACA_DATA_BASE}/stocks/${encodeURIComponent(symbol)}/bars`)
        url.searchParams.set('timeframe', '1Min')
        url.searchParams.set('start', start.toISOString())
        url.searchParams.set('end', end.toISOString())
        url.searchParams.set('limit', '10000')
        url.searchParams.set('adjustment', 'raw')
        url.searchParams.set('feed', 'iex')
        if (pageToken) url.searchParams.set('page_token', pageToken)

        const res = await fetch(url.toString(), { method: 'GET', headers })
        if (!res.ok) {
            const body = await res.text()
            throw new Error(`Alpaca bars request failed (${res.status}): ${body}`)
        }

        const data = (await res.json()) as AlpacaBarsResponse
        if (data.bars) allBars.push(...data.bars)
        pageToken = data.next_page_token ?? null
    } while (pageToken)

    return allBars
}

// ---------------------------------------------------------------------------
// DB gap detection
// ---------------------------------------------------------------------------

/**
 * Find which timestamps within the requested range are already stored.
 * Returns a Set of ISO timestamp strings for fast lookup.
 */
async function getExistingTimestamps(
    symbol: string,
    start: Date,
    end: Date,
): Promise<Set<string>> {
    const rows = await prisma.marketPrice.findMany({
        where: {
            symbol,
            timeframe: '1Min',
            timestamp: { gte: start, lte: end },
        },
        select: { timestamp: true },
    })
    return new Set(rows.map((r) => r.timestamp.toISOString()))
}

// ---------------------------------------------------------------------------
// Upsert new bars
// ---------------------------------------------------------------------------

async function upsertBars(
    symbol: string,
    bars: AlpacaBar[],
    existingTimestamps: Set<string>,
): Promise<{ upserted: number; skipped: number }> {
    const newBars = bars.filter((bar) => !existingTimestamps.has(new Date(bar.t).toISOString()))

    if (newBars.length === 0) return { upserted: 0, skipped: bars.length }

    let upserted = 0
    for (let i = 0; i < newBars.length; i += BATCH_SIZE) {
        const batch = newBars.slice(i, i + BATCH_SIZE)

        // Use createMany with skipDuplicates for efficient bulk insert
        await prisma.marketPrice.createMany({
            data: batch.map((bar) => ({
                symbol,
                timestamp: new Date(bar.t),
                timeframe: '1Min',
                open: new Decimal(bar.o),
                high: new Decimal(bar.h),
                low: new Decimal(bar.l),
                close: new Decimal(bar.c),
                volume: bar.v != null ? BigInt(bar.v) : null,
                vwap: bar.vw != null ? new Decimal(bar.vw) : null,
                tradeCount: bar.n ?? null,
            })),
            skipDuplicates: true,
        })

        upserted += batch.length
    }

    return { upserted, skipped: bars.length - newBars.length }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ensure the database contains 1-minute bars for `symbol` from `start` to
 * `end`.  Bars within the last 15 minutes of the current time are excluded
 * because Alpaca may not have finalised them.
 *
 * 1. Clamp `end` to (now − 15 min) if needed.
 * 2. Query existing timestamps in the range.
 * 3. Fetch missing bars from Alpaca.
 * 4. Upsert into `market_prices_realtime`.
 */
export async function ensureBars(
    symbol: string,
    start: Date,
    end: Date,
): Promise<EnsureBarsResult> {
    const sym = symbol.trim().toUpperCase()
    if (!sym) throw new Error('Symbol is required')

    const clampedEnd = clampEnd(end)

    if (start >= clampedEnd) {
        return {
            symbol: sym,
            start,
            end: clampedEnd,
            fetchedFromApi: 0,
            upsertedToDb: 0,
            skippedExisting: 0,
        }
    }

    // 1. What do we already have?
    const existing = await getExistingTimestamps(sym, start, clampedEnd)

    // 2. Fetch bars from Alpaca
    const bars = await fetchBarsFromAlpaca(sym, start, clampedEnd)

    // 3. Upsert only the new ones
    const { upserted, skipped } = await upsertBars(sym, bars, existing)

    return {
        symbol: sym,
        start,
        end: clampedEnd,
        fetchedFromApi: bars.length,
        upsertedToDb: upserted,
        skippedExisting: skipped,
    }
}
