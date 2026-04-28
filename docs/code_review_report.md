# Code Review Report — Iteration 5

**Project:** InvestEd
**Date:** 2026-04-25

This report records the team's Iteration-5 code review. Code review was a
collaborative effort: every team member participated in reading through the
code-base, raising concerns, and agreeing on which refactorings to apply
versus which to log as follow-ups. The improvements and findings below are
the consolidated output of that joint pass.

We organized the pass around the rubric items (design, complexity, tests,
naming, comments, style, documentation) and walked the team through the
trading, portfolio, market-resolution, and shared UI surfaces together.

---

## Refactorings applied

1. **Extracted the prediction-market reservation-cost formula.** The
   formula `side === 'NO' ? (1 - limitPrice) * qty : limitPrice * qty`
   appeared in four places: `LimitOrderService.placeOrder`,
   `LimitOrderService.cancelOrder`, `MarketService.resolveMarket`, and
   `PortfolioHistoryService.getPortfolioValueHistory`. It has a name in
   the domain (the *reservation cost* — buyer's cost on YES, collateral
   on NO), so we moved it into `src/features/trading/orderPricing.ts` as
   `computeOrderReservation` (Decimal) and `computeOrderReservationNumber`
   (number). Each call site is now a one-liner and the YES/NO asymmetry
   is documented in one place. This is a textbook DRY + Single
   Responsibility fix and, more importantly, makes the domain concept
   *namable*.
2. **Tightened a `useRef<any>` in `TradeChart`.** Replaced with
   `useRef<IChartApi | null>(null)`. The correct type is exported from
   `lightweight-charts`, which was already imported on the same line —
   the `any` was an unnecessary escape hatch.

## Carried-forward fix from earlier in the iteration

PR #123 (`restrict-resolve-to-creator`) is also a review-driven change.
The existing `PATCH /api/markets` had no `requireAuth` call at all, so any
client could resolve any market. The fix now requires authentication,
threads the caller's user ID into `MarketService.resolveMarket`, and
rejects non-creators with HTTP 403 (with a UI change that hides the Resolve
button from non-creators). This was the largest single authorization gap
the team found during the pass.

## Findings logged but not acted on

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
- **No tests.** The trading and portfolio services we reviewed have no
  unit-test coverage. A few targeted tests around
  `computeOrderReservation`, `matchOrders` partial-fill behavior, and
  the new `resolveMarket` creator check would have caught the
  authorization bug above.

## Process notes

- **Design / complexity.** Most of the substance above falls under these
  two headings — the duplicated reservation formula and the oversized
  `executeTrade` / `matchOrders` / `getPortfolioValueHistory` functions
  are the design issues we flagged. The two applied refactorings are the
  ones we judged safe to land mid-iteration; the rest are scoped for
  follow-up because they touch service boundaries.
- **Tests.** Coverage gaps are the single biggest risk surfaced by the
  review. We chose not to add tests in this pass to keep the diff small,
  but the missing-tests finding is the top-priority follow-up.
- **Naming, comments, style.** No widespread issues — a handful of
  local-variable rename opportunities are listed above. Comments in the
  reviewed files are sparse but accurate; nothing was misleading.
- **Documentation.** Install/run instructions in the top-level README
  were spot-checked and still work as written; no changes needed this
  iteration.
