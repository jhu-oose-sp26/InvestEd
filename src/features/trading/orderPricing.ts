import { Decimal } from '@prisma/client/runtime/library'

export type OrderSide = 'YES' | 'NO'

/**
 * Cash a user must reserve when placing a limit order on a binary
 * prediction market.
 *
 * - YES buyers pay `limitPrice` per share (their cost if filled).
 * - NO buyers post `(1 - limitPrice)` per share as collateral
 *   (their max loss if YES wins; the contract pays $1/share to the
 *   winning side).
 *
 * Used at order placement (debit) and at order cancellation / market
 * resolution (refund). Centralizing this avoids the formula drifting
 * between callers.
 */
export function computeOrderReservation(
  side: OrderSide,
  limitPrice: Decimal | number | string,
  quantity: number
): Decimal {
  const price = new Decimal(limitPrice)
  const perShare = side === 'NO' ? new Decimal(1).minus(price) : price
  return perShare.times(quantity)
}

/** Numeric variant for callers that need a plain JS number (e.g. UI/history simulation). */
export function computeOrderReservationNumber(
  side: OrderSide,
  limitPrice: number,
  quantity: number
): number {
  return side === 'NO' ? (1 - limitPrice) * quantity : limitPrice * quantity
}
