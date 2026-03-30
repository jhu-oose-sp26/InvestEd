import type { QuarterlyReportRecord, QuarterlyStatements, PerformanceWindow, ReportMatchupDataset } from '@/types'
import { prisma } from '@/lib/prisma'

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

export async function loadDataset(): Promise<ReportMatchupDataset> {
  const rows = await prisma.quarterlyReport.findMany({
    orderBy: [{ symbol: 'asc' }, { quarter: 'asc' }],
  })
  if (rows.length === 0) {
    throw new Error('No quarterly report data available. Run the pipeline to populate the database.')
  }
  return {
    generatedAt: new Date().toISOString(),
    reports: rows.map(toReportRecord),
  }
}
