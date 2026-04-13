import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response
  const userId = auth.user.id

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
