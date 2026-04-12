import { NextResponse } from 'next/server'
import {
  getReportMatchupErrorStatus,
  getReportOptions,
  ReportMatchupError,
} from '@/features/report-matchup/reportMatchupDataset'
import { httpErrorBody, httpErrorResponse } from '@/lib/api/httpErrors'

export async function GET() {
  try {
    const options = await getReportOptions()
    return NextResponse.json(options)
  } catch (error) {
    console.error('Report options API error:', error)
    if (error instanceof ReportMatchupError) {
      return NextResponse.json(httpErrorBody(error.code), { status: error.status })
    }
    return httpErrorResponse('IE_REP_007', getReportMatchupErrorStatus(error))
  }
}
