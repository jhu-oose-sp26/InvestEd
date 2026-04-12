/**
 * Shared explanations when data is missing or something goes wrong.
 * Wording is for people using the product—no internal systems or engineering terms.
 */

/** Remove trailing reference codes like (IE_CFG_001) for calmer on-screen messages. */
export function softenPublicErrorMessage(message: string): string {
  const trimmed = message.replace(/\s*\([A-Z]{2,3}_[A-Z0-9_]+\)\s*$/i, "").trim()
  return trimmed || message.trim()
}

export const DATA_UNAVAILABLE = {
  marketPriceRow:
    "We don’t have a price for this symbol right now. It may be outside trading hours, lightly traded, or temporarily unavailable.",
  marketPriceSeeNotice: "Price unavailable—see the note above.",
  changeVsClose:
    "Change and percent change need yesterday’s closing price. That isn’t loaded for this symbol yet, or we only have a simple price without the full comparison.",
  /** Tooltip: price from periodic update */
  snapshotQuoteExplainer: "This price came from a regular update, not from the very latest trade.",
  /** Tooltip: from streaming trades */
  streamQuoteExplainer: "This time reflects the last trade we received for this symbol.",
  /** Why many rows share 4:00 PM after close */
  marketCloseTimeExplainer:
    "After U.S. markets close, many stocks show the same official closing time (about 4:00 PM Eastern) even though prices differ. That’s normal—it isn’t the exact moment each stock last moved.",
  /** Main clock / age */
  lastUpdatedServedExplainer:
    "The main clock and “how long ago” show when this row was last refreshed for you.",
  chartNoBars:
    "There’s no chart data for this symbol and date. Trading may have been closed that day, or price history isn’t available for that range yet.",
  livePriceStale:
    "Showing the last price we had; we couldn’t refresh it just now. Check the message below or try again.",
  livePriceNone:
    "We couldn’t load a current price for this symbol. It may be invalid, the market may be closed, or prices may be temporarily unavailable.",
  portfolioMissing:
    "We couldn’t load your portfolio summary. Try refreshing the page, or sign in again if the problem continues.",
  portfolioHistory:
    "There’s no saved value history to show yet. It builds after you hold positions and prices update.",
  portfolioAllocation:
    "There’s nothing to chart yet—add cash or buy a position to see how your money is split.",
  portfolioPositions:
    "You don’t have any open positions yet. Buy a stock on the Trade page to build your portfolio.",
  portfolioSector:
    "We can’t show how your holdings split by industry yet. Some company details aren’t available for those stocks.",
} as const

export const MARKETS_CELL_SHORT = {
  price: "Price unavailable",
  priceSeeNotice: "Unavailable",
  change: "Not available yet",
  lastUpdated: "No time yet",
} as const
