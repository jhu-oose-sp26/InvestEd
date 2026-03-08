import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ReportMatchupDataset } from '@/types'

const DEFAULT_DATASET_PATH = path.join(
  process.cwd(),
  'mag7_fmp_financials',
  '_derived',
  'quarterly_report_matchups.json'
)

export async function loadDataset(): Promise<ReportMatchupDataset> {
  const datasetPath = process.env.REPORT_MATCHUP_DATA_PATH || DEFAULT_DATASET_PATH
  const content = await readFile(datasetPath, 'utf8')
  const parsed = JSON.parse(content) as ReportMatchupDataset
  if (!Array.isArray(parsed.reports)) {
    throw new Error('Report matchup dataset is malformed')
  }
  return parsed
}
