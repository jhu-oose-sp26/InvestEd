import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || 'temp-user-id'

  try {
    const positions = await prisma.marketPosition.findMany({
      where: { userId, OR: [{ yesQuantity: { gt: 0 } }, { noQuantity: { gt: 0 } }] },
      include: { market: { select: { title: true, status: true, outcome: true } } },
    })
    return NextResponse.json({ positions })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
