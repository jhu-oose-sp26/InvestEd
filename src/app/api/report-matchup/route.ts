import { NextRequest, NextResponse } from 'next/server'
import {
  getReportMatchup,
  getReportMatchupErrorStatus,
  ReportMatchupError,
} from '@/features/report-matchup/reportMatchupDataset'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'

export async function GET(request: NextRequest) {
  try {
    const left = request.nextUrl.searchParams.get('left')
    const right = request.nextUrl.searchParams.get('right')
    const quarter = request.nextUrl.searchParams.get('quarter')

    const matchup = await getReportMatchup(left, right, quarter)
    return NextResponse.json(matchup)
  } catch (error) {
    console.error('Report matchup API error:', error)
    if (error instanceof ReportMatchupError) {
      return NextResponse.json(httpErrorBody(error.code), { status: error.status })
    }
    return httpErrorResponse('IE_REP_007', getReportMatchupErrorStatus(error))
  }
}
