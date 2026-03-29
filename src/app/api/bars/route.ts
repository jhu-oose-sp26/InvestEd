/**
 * GET /api/bars?symbol=AAPL&start=2026-03-10T09:30:00Z&end=2026-03-10T16:00:00Z
 *
 * Ensures the database has 15-minute bars for the requested symbol and interval,
 * then returns them. If the interval reaches within 15 minutes of the current
 * time, those last 15 minutes are excluded (bars not yet finalised or restricted by API).
 */

import { NextRequest, NextResponse } from 'next/server'
import { ensureBars } from '@alpaca-data-pipeline/alpacaBarService'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams
        const symbol = params.get('symbol')?.trim().toUpperCase()
        const startRaw = params.get('start')
        const endRaw = params.get('end')

        if (!symbol || !startRaw || !endRaw) {
            return NextResponse.json(
                { error: 'Missing required query parameters: symbol, start, end' },
                { status: 400 },
            )
        }

        const start = new Date(startRaw)
        let end = new Date(endRaw)

        const nowMinus15 = new Date(Date.now() - 15 * 60 * 1000)
        if (end > nowMinus15) {
            end = nowMinus15
        }

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format for start or end. Use ISO 8601.' },
                { status: 400 },
            )
        }

        if (start >= end) {
            return NextResponse.json(
                { error: 'start must be before end' },
                { status: 400 },
            )
        }

        // Ensure the DB has all bars for this range (fetches from Alpaca if needed)
        const result = await ensureBars(symbol, start, end)

        // Now read the 1-minute bars back from the database
        const rawBars = await prisma.marketPrice.findMany({
            where: {
                symbol,
                timeframe: '1Min', // DB stores 1Min bars via Alpaca pipeline
                timestamp: { gte: start, lte: end },
            },
            orderBy: { timestamp: 'asc' },
            select: {
                timestamp: true,
                open: true,
                high: true,
                low: true,
                close: true,
                volume: true,
            },
        })

        // Combine fifteen 1-minute data points into one 15-minute candle
        const bucketedBars: Record<number, any> = {}

        for (const b of rawBars) {
            const t = b.timestamp
            const min = t.getMinutes()
            const bucketMin = min - (min % 15)
            
            // Map the timestamp to the start of its 15-minute interval
            const bucketDate = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), bucketMin, 0, 0)
            const bucketMs = bucketDate.getTime()

            if (!bucketedBars[bucketMs]) {
                bucketedBars[bucketMs] = {
                    t: bucketDate.toISOString(),
                    o: b.open.toNumber(),
                    h: b.high.toNumber(),
                    l: b.low.toNumber(),
                    c: b.close.toNumber(),
                    v: b.volume ? Number(b.volume) : 0,
                    vw: null,
                    n: null,
                }
            } else {
                const bucket = bucketedBars[bucketMs]
                bucket.h = Math.max(bucket.h, b.high.toNumber())
                bucket.l = Math.min(bucket.l, b.low.toNumber())
                bucket.c = b.close.toNumber() // End close becomes the bucket close
                if (b.volume) bucket.v += Number(b.volume)
            }
        }

        const finalBars = Object.values(bucketedBars).sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime())

        return NextResponse.json({
            symbol,
            timeframe: '15Min',
            start: start.toISOString(),
            end: end.toISOString(),
            count: finalBars.length,
            pipeline: {
                fetchedFromApi: result.fetchedFromApi,
                upsertedToDb: result.upsertedToDb,
                skippedExisting: result.skippedExisting,
            },
            bars: finalBars,
        })
    } catch (error) {
        console.error('Bars API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 },
        )
    }
}
