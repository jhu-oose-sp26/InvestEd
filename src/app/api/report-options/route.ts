import { NextResponse } from 'next/server'
import {
  getReportMatchupErrorStatus,
  getReportOptions,
} from '@/features/report-matchup/reportMatchupDataset'

export async function GET() {
  try {
    const options = await getReportOptions()
    return NextResponse.json(options)
  } catch (error) {
    console.error('Report options API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: getReportMatchupErrorStatus(error) }
    )
  }
}
