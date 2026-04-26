# Code Review Report — Iteration 5

**Project:** InvestEd
**Date:** 2026-04-25

This report records my (Hanliang's) portion of the Iteration-5 code review.
Other team members will add their own sections below.

---

## Hanliang Xu — `src/features/trading/`, `src/features/portfolio/`, `src/components/ui/TradeChart.tsx`

### Refactorings applied

1. **Extracted the prediction-market reservation-cost formula.** The
   formula `side === 'NO' ? (1 - limitPrice) * qty : limitPrice * qty`
   appeared in four places: `LimitOrderService.placeOrder`,
   `LimitOrderService.cancelOrder`, `MarketService.resolveMarket`, and
   `PortfolioHistoryService.getPortfolioValueHistory`. It has a name in
   the domain (the *reservation cost* — buyer's cost on YES, collateral
   on NO), so I moved it into `src/features/trading/orderPricing.ts` as
   `computeOrderReservation` (Decimal) and `computeOrderReservationNumber`
   (number). Each call site is now a one-liner and the YES/NO asymmetry
   is documented in one place. This is a textbook DRY + Single
   Responsibility fix and, more importantly, makes the domain concept
   *namable*.
2. **Tightened a `useRef<any>` in `TradeChart`.** Replaced with
   `useRef<IChartApi | null>(null)`. The correct type is exported from
   `lightweight-charts`, which was already imported on the same line —
   the `any` was an unnecessary escape hatch.

### Carried-forward fix from earlier in the iteration

PR #123 (`restrict-resolve-to-creator`) is also a review-driven change.
The existing `PATCH /api/markets` had no `requireAuth` call at all, so any
client could resolve any market. The fix now requires authentication,
threads the caller's user ID into `MarketService.resolveMarket`, and
rejects non-creators with HTTP 403 (with a UI change that hides the Resolve
button from non-creators). This was the largest single authorization gap
I found in my pass.

### Findings I logged but did not act on

- **Repository pattern.** Every service in `src/features/` calls
  `prisma.*` directly — a Dependency Inversion violation that makes the
  services not unit-testable without a real database. Worth its own
  iteration.
- **`executeTrade` (TradeService.ts:36–189)** is ~150 lines with the BUY
  and SELL paths inlined. Splitting into `executeBuy` / `executeSell`
  would make each path independently readable.
- **`matchOrders` (LimitOrderService.ts)** hides a small state machine in
  a `while` loop with two index pointers and two parallel `*Rem` arrays.
  An `OrderMatcher` class would clarify the partial-fill semantics.
- **`getPortfolioValueHistory` (~110 lines)** does initial-cash
  reconstruction, event-timeline assembly, and forward simulation in one
  function. Splitting each phase out would make the simulator
  unit-testable in isolation.
- **Naming.** `Tx` is used as a local Prisma transaction-client alias in
  three trading services; `predShares` / `stockPositions` in
  `PortfolioHistoryService` would read better as
  `predictionMarketPositions` / `equityPositions`.
- **No tests.** The trading and portfolio services I reviewed have no
  unit-test coverage. A few targeted tests around
  `computeOrderReservation`, `matchOrders` partial-fill behavior, and
  the new `resolveMarket` creator check would have caught the
  authorization bug above.

---

## \<Team member 2\>

> _Add your section here — what you reviewed, what you refactored, and
> what you logged as a follow-up._

## \<Team member 3\>

> _Add your section here._

## \<Team member 4\>

> _Add your section here._

## \<Team member 5\>

> _Add your section here._
