import { NextRequest, NextResponse } from 'next/server'
import { limitOrderService } from '@/features/trading/LimitOrderService'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { marketId, side, orderType = 'LIMIT', limitPrice, quantity } = await request.json()
    const userId = auth.user.id

    const result = await limitOrderService.placeOrder({ userId, marketId, side, orderType, limitPrice, quantity })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const filled = await limitOrderService.matchOrders(marketId)

    // IOC: cancel if still unfilled after matching
    if (orderType === 'IOC') {
      const order = await prisma.limitOrder.findUnique({ where: { id: result.orderId } })
      if (order?.status === 'OPEN') {
        await limitOrderService.cancelOrder(result.orderId!, userId)
      }
    }

    return NextResponse.json({ ...result, filled })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id
    const orders = await limitOrderService.getUserOrders(userId)
    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { orderId } = await request.json()
    const userId = auth.user.id

    const result = await limitOrderService.cancelOrder(orderId, userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
