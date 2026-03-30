import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/quarterly-reports — list available reports, optionally filtered by symbol */
export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')

    const reports = await prisma.quarterlyReport.findMany({
      where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
      select: {
        id: true,
        symbol: true,
        quarter: true,
        statementDate: true,
        releaseDate: true,
        statements: true,
      },
      orderBy: [{ symbol: 'asc' }, { quarter: 'desc' }],
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('GET /api/quarterly-reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
