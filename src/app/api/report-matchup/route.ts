import { NextRequest, NextResponse } from 'next/server'
import {
  getReportMatchup,
  getReportMatchupErrorStatus,
} from '@/features/report-matchup/reportMatchupDataset'

export async function GET(request: NextRequest) {
  try {
    const left = request.nextUrl.searchParams.get('left')
    const right = request.nextUrl.searchParams.get('right')
    const quarter = request.nextUrl.searchParams.get('quarter')

    const matchup = await getReportMatchup(left, right, quarter)
    return NextResponse.json(matchup)
  } catch (error) {
    console.error('Report matchup API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: getReportMatchupErrorStatus(error) }
    )
  }
}
