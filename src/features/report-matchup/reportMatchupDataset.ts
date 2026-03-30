import type {
  QuarterlyReportRecord,
  QuarterlyStatements,
  PerformanceWindow,
  ReportMatchupResponse,
  ReportOptionsResponse,
} from '@/types'
import { prisma } from '@/lib/prisma'

class ReportMatchupError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function parseQuarter(quarter: string): { year: number; quarter: number } {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/)
  if (!match) {
    return { year: 0, quarter: 0 }
  }

  return {
    year: Number(match[1]),
    quarter: Number(match[2]),
  }
}

function compareQuarterDesc(left: string, right: string): number {
  const parsedLeft = parseQuarter(left)
  const parsedRight = parseQuarter(right)

  if (parsedLeft.year !== parsedRight.year) {
    return parsedRight.year - parsedLeft.year
  }

  return parsedRight.quarter - parsedLeft.quarter
}

function normalizeSymbol(symbol: string | null): string | null {
  const trimmed = symbol?.trim().toUpperCase() || null
  return trimmed && /^[A-Z.]+$/.test(trimmed) ? trimmed : null
}

function toReportRecord(row: {
  symbol: string
  quarter: string
  statementDate: string
  releaseDate: string
  statements: unknown
  performance: unknown
}): QuarterlyReportRecord {
  return {
    symbol: row.symbol,
    quarter: row.quarter,
    statementDate: row.statementDate,
    releaseDate: row.releaseDate,
    statements: row.statements as unknown as QuarterlyStatements,
    performance: row.performance as unknown as PerformanceWindow,
  }
}

async function loadDataset(): Promise<QuarterlyReportRecord[]> {
  const rows = await prisma.quarterlyReport.findMany({
    orderBy: [{ symbol: 'asc' }, { quarter: 'asc' }],
  })
  if (rows.length === 0) {
    throw new ReportMatchupError(503, 'No quarterly report data available. Run the pipeline to populate the database.')
  }
  return rows.map(toReportRecord)
}

function reportsBySymbol(reports: QuarterlyReportRecord[]): Map<string, QuarterlyReportRecord[]> {
  const grouped = new Map<string, QuarterlyReportRecord[]>()

  for (const report of reports) {
    const list = grouped.get(report.symbol) || []
    list.push(report)
    grouped.set(report.symbol, list)
  }

  for (const list of grouped.values()) {
    list.sort((left, right) => compareQuarterDesc(left.quarter, right.quarter))
  }

  return grouped
}

export async function getReportOptions(): Promise<ReportOptionsResponse> {
  const reports = await loadDataset()
  const grouped = reportsBySymbol(reports)
  const symbols = Array.from(grouped.keys()).sort()

  const quartersBySymbol = Object.fromEntries(
    symbols.map((symbol) => [
      symbol,
      Array.from(new Set(grouped.get(symbol)!.map((report) => report.quarter))).sort(compareQuarterDesc),
    ])
  )

  const quarterCounts = new Map<string, number>()
  for (const quarters of Object.values(quartersBySymbol)) {
    for (const quarter of quarters) {
      quarterCounts.set(quarter, (quarterCounts.get(quarter) || 0) + 1)
    }
  }

  const quarters = Array.from(quarterCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([quarter]) => quarter)
    .sort(compareQuarterDesc)

  return {
    symbols,
    quarters,
    quartersBySymbol,
  }
}

export async function getReportMatchup(
  leftSymbolInput: string | null,
  rightSymbolInput: string | null,
  quarter?: string | null
): Promise<ReportMatchupResponse> {
  const leftSymbol = normalizeSymbol(leftSymbolInput)
  const rightSymbol = normalizeSymbol(rightSymbolInput)

  if (!leftSymbol || !rightSymbol) {
    throw new ReportMatchupError(400, 'Missing or invalid required query parameters: left, right')
  }

  if (leftSymbol === rightSymbol) {
    throw new ReportMatchupError(400, 'left and right must be different symbols')
  }

  const reports = await loadDataset()
  const grouped = reportsBySymbol(reports)

  const leftReports = grouped.get(leftSymbol)
  const rightReports = grouped.get(rightSymbol)
  if (!leftReports || !rightReports) {
    throw new ReportMatchupError(400, 'Unsupported symbol requested')
  }

  const leftQuarters = new Set(leftReports.map((report) => report.quarter))
  const rightQuarters = new Set(rightReports.map((report) => report.quarter))
  const commonQuarters = Array.from(leftQuarters).filter((value) => rightQuarters.has(value))
  commonQuarters.sort(compareQuarterDesc)

  if (commonQuarters.length === 0) {
    throw new ReportMatchupError(404, 'No common valid quarter for the requested symbols')
  }

  const selectedQuarter = quarter?.trim() || commonQuarters[0]
  if (!commonQuarters.includes(selectedQuarter)) {
    throw new ReportMatchupError(404, 'Requested quarter is not available for both symbols')
  }

  const left = leftReports.find((report) => report.quarter === selectedQuarter)
  const right = rightReports.find((report) => report.quarter === selectedQuarter)
  if (!left || !right) {
    throw new ReportMatchupError(404, 'Requested quarter is not available for both symbols')
  }

  return {
    quarter: selectedQuarter,
    left,
    right,
    winnerSymbol:
      left.performance.percentReturn >= right.performance.percentReturn ? left.symbol : right.symbol,
  }
}

export function getReportMatchupErrorStatus(error: unknown): number {
  return error instanceof ReportMatchupError ? error.status : 500
}
