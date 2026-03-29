/**
 * GET /api/bars?symbol=AAPL&start=2026-03-10T09:30:00Z&end=2026-03-10T16:00:00Z
 *
 * Ensures the database has 1-minute bars for the requested symbol and interval,
 * then returns them.  If the interval reaches within 15 minutes of the current
 * time, those last 15 minutes are excluded (bars not yet finalised).
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
        const end = new Date(endRaw)

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

        // Now read the bars back from the database
        const bars = await prisma.marketPrice.findMany({
            where: {
                symbol,
                timeframe: '1Min',
                timestamp: { gte: start, lte: result.end },
            },
            orderBy: { timestamp: 'asc' },
            select: {
                timestamp: true,
                open: true,
                high: true,
                low: true,
                close: true,
                volume: true,
                vwap: true,
                tradeCount: true,
            },
        })

        return NextResponse.json({
            symbol,
            timeframe: '1Min',
            start: result.start.toISOString(),
            end: result.end.toISOString(),
            count: bars.length,
            pipeline: {
                fetchedFromApi: result.fetchedFromApi,
                upsertedToDb: result.upsertedToDb,
                skippedExisting: result.skippedExisting,
            },
            bars: bars.map((b) => ({
                t: b.timestamp.toISOString(),
                o: b.open.toNumber(),
                h: b.high.toNumber(),
                l: b.low.toNumber(),
                c: b.close.toNumber(),
                v: b.volume != null ? Number(b.volume) : null,
                vw: b.vwap?.toNumber() ?? null,
                n: b.tradeCount ?? null,
            })),
        })
    } catch (error) {
        console.error('Bars API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 },
        )
    }
}
