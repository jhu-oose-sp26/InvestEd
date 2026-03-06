import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  QuarterlyReportRecord,
  ReportMatchupDataset,
  ReportMatchupResponse,
  ReportOptionsResponse,
} from '@/types'

const DEFAULT_DATASET_PATH = path.join(
  process.cwd(),
  'mag7_fmp_financials',
  '_derived',
  'quarterly_report_matchups.json'
)

class ReportMatchupError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getDatasetPath(): string {
  return process.env.REPORT_MATCHUP_DATA_PATH || DEFAULT_DATASET_PATH
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

async function loadDataset(): Promise<ReportMatchupDataset> {
  try {
    const content = await readFile(getDatasetPath(), 'utf8')
    const parsed = JSON.parse(content) as ReportMatchupDataset
    if (!Array.isArray(parsed.reports)) {
      throw new ReportMatchupError(500, 'Report matchup dataset is malformed')
    }
    return parsed
  } catch (error) {
    if (error instanceof ReportMatchupError) {
      throw error
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ReportMatchupError(
        500,
        'Report matchup dataset not found. Build mag7_fmp_financials/_derived/quarterly_report_matchups.json first.'
      )
    }

    throw new ReportMatchupError(500, 'Failed to load report matchup dataset')
  }
}

function reportsBySymbol(dataset: ReportMatchupDataset): Map<string, QuarterlyReportRecord[]> {
  const grouped = new Map<string, QuarterlyReportRecord[]>()

  for (const report of dataset.reports) {
    const reports = grouped.get(report.symbol) || []
    reports.push(report)
    grouped.set(report.symbol, reports)
  }

  for (const reports of grouped.values()) {
    reports.sort((left, right) => compareQuarterDesc(left.quarter, right.quarter))
  }

  return grouped
}

export async function getReportOptions(): Promise<ReportOptionsResponse> {
  const dataset = await loadDataset()
  const grouped = reportsBySymbol(dataset)
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

  const dataset = await loadDataset()
  const grouped = reportsBySymbol(dataset)

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
