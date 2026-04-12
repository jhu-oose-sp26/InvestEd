import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/** GET — Current user (Bearer token or session cookie) and their portfolios. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { user } = auth
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, cashBalance: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firebaseUid: user.firebaseUid,
        createdAt: user.createdAt.toISOString(),
      },
      portfolios: portfolios.map((p) => ({
        id: p.id,
        name: p.name,
        cashBalance: p.cashBalance.toString(),
      })),
    })
  } catch (e) {
    console.error('GET /api/auth/me:', e)
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
