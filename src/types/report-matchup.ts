export interface DailyClosePoint {
  date: string
  close: number
}

export interface PerformanceWindow {
  startDate: string
  endDate: string
  startClose: number
  endClose: number
  absoluteChange: number
  percentReturn: number
  dailyCloses: DailyClosePoint[]
}

export interface QuarterlyStatements {
  income: Record<string, string | number | null>
  balance: Record<string, string | number | null>
  cashflow: Record<string, string | number | null>
}

export interface QuarterlyReportRecord {
  symbol: string
  quarter: string
  statementDate: string
  releaseDate: string
  statements: QuarterlyStatements
  performance: PerformanceWindow
}

export interface ReportMatchupDataset {
  generatedAt: string
  reports: QuarterlyReportRecord[]
}

export interface ReportMatchupResponse {
  quarter: string
  left: QuarterlyReportRecord
  right: QuarterlyReportRecord
  winnerSymbol: string
}

export interface ReportOptionsResponse {
  symbols: string[]
  quarters: string[]
  quartersBySymbol: Record<string, string[]>
}
