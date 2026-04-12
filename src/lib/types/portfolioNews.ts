/** Normalized headline row from GET /api/portfolios/[id]/news */
export type PortfolioNewsEntry = {
  id: number
  symbol: string
  datetime: number
  headline: string
  source?: string
  url: string
  image?: string
  category?: string
}
