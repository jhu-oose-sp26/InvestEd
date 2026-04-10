import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const createBody = z.object({
  name: z.string().max(100).optional(),
})

/**
 * POST /api/portfolios — Create a paper-trading portfolio for the signed-in user.
 * GET summary/history: /api/portfolios/[id] and /api/portfolios/[id]/history
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  let name: string | undefined
  try {
    const raw = await request.json().catch(() => ({}))
    const parsed = createBody.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    name = parsed.data.name
  } catch {
    // empty body ok
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: auth.user.id,
      name: name?.trim() || 'My Portfolio',
    },
    select: { id: true, name: true, cashBalance: true },
  })

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      cashBalance: portfolio.cashBalance.toString(),
    },
  })
}
