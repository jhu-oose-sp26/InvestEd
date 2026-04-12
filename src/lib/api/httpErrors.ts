/**
 * Central API error catalog: user-facing copy + developer notes.
 * JSON shape: `{ error: "<user message> (<CODE>)", code: "<CODE>" }`
 */

import { NextResponse } from 'next/server'
import { PORTFOLIO_ERRORS } from '@/lib/userFacingMessages'

export const HTTP_ERROR_CATALOG = {
  IE_GEN_001: {
    user: 'Something went wrong on our side. Please try again in a moment.',
    dev: 'Unhandled exception in an API route; inspect server logs for the stack trace.',
  },

  IE_VAL_001: {
    user: 'Some information was not valid. Please check what you entered and try again.',
    dev: 'Request query or body failed schema validation (e.g. Zod safeParse). Details are logged server-side.',
  },
  IE_VAL_002: {
    user: 'Please enter valid start and end dates and times.',
    dev: 'Date parsing failed for start/end parameters.',
  },
  IE_VAL_003: {
    user: 'The end time must be after the start time.',
    dev: 'start >= end after parsing dates.',
  },
  IE_VAL_004: {
    user: 'A stock symbol is required.',
    dev: 'GET /api/live-quote without a non-empty symbol query param.',
  },
  IE_VAL_005: {
    user: 'At least one stock symbol is required.',
    dev: 'GET /api/live-quotes with empty or missing symbols list.',
  },
  IE_VAL_006: {
    user: 'To load this chart we need a symbol plus start and end times.',
    dev: 'GET /api/bars missing symbol, start, or end.',
  },
  IE_VAL_007: {
    user: 'Trade details are incomplete. Please enter symbol, buy or sell, and quantity.',
    dev: 'POST /api/trades missing symbol, type, or quantity.',
  },
  IE_VAL_008: {
    user: 'Trade type must be buy or sell.',
    dev: 'POST /api/trades type not BUY or SELL.',
  },
  IE_VAL_009: {
    user: 'A stock symbol is required.',
    dev: 'GET /api/quote missing symbol query param.',
  },

  IE_CFG_001: {
    user: 'Live stock prices are not available here yet.',
    dev: 'FINNHUB_API_KEY missing or blank in server environment.',
  },
  IE_CFG_002: {
    user: 'Saved historical prices are not available here yet.',
    dev: 'Supabase not configured (HOST / POSTGRES_PASSWORD for candle pipeline).',
  },

  IE_MKT_001: {
    user: 'Price updates are temporarily limited. Please wait a minute and try again.',
    dev: 'Finnhub rate limit (429) or equivalent from quote service.',
  },
  IE_MKT_002: {
    user: 'We could not load a live price for that symbol. It may be unavailable or the market may be closed.',
    dev: 'getLiveQuote returned null after REST/WebSocket attempts.',
  },
  IE_MKT_003: {
    user: 'We could not load market data right now. Please try again shortly.',
    dev: 'Unexpected error from Finnhub client or live quote path (non-rate-limit).',
  },
  IE_MKT_004: {
    user: 'We could not load that stock price. Please try again.',
    dev: 'GET /api/quote provider threw or returned unusable data.',
  },

  IE_TRD_001: {
    user: 'This trade could not be placed. Check your cash balance, shares owned, and order details.',
    dev: 'tradeService.executeTrade returned success: false (business rule failure).',
  },
  IE_TRD_002: {
    user: 'Something went wrong while processing your trade. Please try again.',
    dev: 'Unhandled exception in POST /api/trades.',
  },

  IE_PFO_001: {
    user: PORTFOLIO_ERRORS.loadFailed,
    dev: 'Exception in GET /api/portfolio.',
  },
  IE_PFO_002: {
    user: PORTFOLIO_ERRORS.historyLoadFailed,
    dev: 'Exception in GET /api/portfolio/history.',
  },

  IE_BAR_001: {
    user: 'Chart data could not be loaded. Please try again.',
    dev: 'Exception in GET /api/bars (ensureBars, Prisma, or bucketing).',
  },

  IE_CAN_001: {
    user: 'Price chart data could not be loaded. Please try again later.',
    dev: 'Supabase query error on market_candles.',
  },
  IE_CAN_002: {
    user: 'Price chart data could not be loaded. Please try again.',
    dev: 'Unhandled exception in GET /api/candles.',
  },

  IE_QSN_001: {
    user: 'Saved price history could not be loaded. Please try again later.',
    dev: 'Supabase query error on market_quote_snapshots.',
  },
  IE_QSN_002: {
    user: 'Saved price history could not be loaded. Please try again.',
    dev: 'Unhandled exception in GET /api/quote-snapshots.',
  },

  IE_QZ_404: {
    user: 'That quiz could not be found.',
    dev: 'Custom quiz or question id not found.',
  },
  IE_QZ_403: {
    user: 'You do not have access to this quiz.',
    dev: 'Authenticated user does not own private quiz or lacks permission.',
  },
  IE_QZ_V01: {
    user: 'Please enter a title for your quiz.',
    dev: 'POST /api/custom-quizzes: title missing or blank.',
  },
  IE_QZ_V02: {
    user: 'Quiz title must be 200 characters or fewer.',
    dev: 'Title length > 200.',
  },
  IE_QZ_V03: {
    user: 'Add at least one question before making a quiz public.',
    dev: 'PATCH isPublic true with zero questions.',
  },
  IE_QZ_V04: {
    user: 'Title cannot be empty.',
    dev: 'PATCH quiz: title provided but empty string.',
  },
  IE_QZ_V05: {
    user: 'Quiz title must be 200 characters or fewer.',
    dev: 'PATCH quiz: title too long.',
  },
  IE_QZ_V06: {
    user: 'Each question needs a prompt.',
    dev: 'POST question: prompt missing or blank.',
  },
  IE_QZ_V07: {
    user: 'Each question needs between 2 and 6 answer choices.',
    dev: 'options array length not in [2,6].',
  },
  IE_QZ_V08: {
    user: 'Answer choices cannot be empty.',
    dev: 'An option string was blank.',
  },
  IE_QZ_V09: {
    user: 'The correct answer must match one of the choices.',
    dev: 'correctAnswer not in options.',
  },
  IE_QZ_V10: {
    user: 'Each question needs between 2 and 6 answer choices.',
    dev: 'PATCH question: options length invalid.',
  },
  IE_QZ_V11: {
    user: 'Answer choices cannot be empty.',
    dev: 'PATCH question: empty option string.',
  },
  IE_QZ_V12: {
    user: 'When you change the choices, pick which answer is correct.',
    dev: 'PATCH question: correctAnswer not in new options set.',
  },
  IE_QZ_SRV: {
    user: 'We could not save your quiz. Please try again.',
    dev: 'Unhandled Prisma or server error in custom-quiz routes.',
  },

  IE_QDAILY_001: {
    user: 'Daily quiz content is not available yet.',
    dev: 'Quiz dataset missing (ENOENT) or not deployed.',
  },
  IE_QDAILY_002: {
    user: 'The daily quiz could not be loaded. Please try again.',
    dev: 'getDailyQuestions threw a non-ENOENT error.',
  },

  IE_QTR_001: {
    user: 'Quarterly reports could not be loaded. Please try again.',
    dev: 'GET /api/quarterly-reports database or server error.',
  },

  IE_REP_001: {
    user: 'Report comparison data is not ready yet. Please try again later.',
    dev: 'No rows in quarterlyReport table (pipeline not run).',
  },
  IE_REP_002: {
    user: 'Please choose two different companies to compare.',
    dev: 'Missing or invalid left/right query params after normalization.',
  },
  IE_REP_003: {
    user: 'Please choose two different companies to compare.',
    dev: 'left and right symbols are identical.',
  },
  IE_REP_004: {
    user: 'One or both companies are not available for comparison.',
    dev: 'Symbol not present in loaded quarterly reports.',
  },
  IE_REP_005: {
    user: 'No overlapping quarter was found for those companies.',
    dev: 'No common quarters between the two symbols.',
  },
  IE_REP_006: {
    user: 'That quarter is not available for both companies.',
    dev: 'Requested quarter not in common set.',
  },
  IE_REP_007: {
    user: 'Report data could not be loaded. Please try again.',
    dev: 'Unhandled error in report matchup/options handlers.',
  },

  IE_CLT_001: {
    user: 'We could not load live prices. Check your internet connection and try again.',
    dev: 'Client fetch failed in useLiveQuotes (network, CORS, or non-JSON response).',
  },
  IE_CLT_002: {
    user: 'We could not load that price. Check your internet connection and try again.',
    dev: 'Client fetch failed in useLivePrice (network or non-JSON response).',
  },
} as const

export type HttpErrorCode = keyof typeof HTTP_ERROR_CATALOG

export type HttpErrorPayload = { error: string; code: HttpErrorCode }

export function httpErrorBody(code: HttpErrorCode): HttpErrorPayload {
  const row = HTTP_ERROR_CATALOG[code]
  return { error: `${row.user} (${code})`, code }
}

export function httpErrorResponse(code: HttpErrorCode, status: number): NextResponse<HttpErrorPayload> {
  return NextResponse.json(httpErrorBody(code), { status })
}
