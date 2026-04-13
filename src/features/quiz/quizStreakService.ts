import type { QuizQuestion } from '@/types/quiz'
import { prisma } from '@/lib/prisma'
import { getDailyQuestions } from '@/features/quiz/quizService'

/** UTC calendar day YYYY-MM-DD — matches quiz page `toISOString().slice(0, 10)`. */
export function utcTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isValidQuizDateParam(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function previousUtcDateString(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

function nextUtcDateString(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10)
}

/** Streak counts only days where the user got every question right. */
export function isStreakSuccess(correctCount: number, totalQuestions: number): boolean {
  return totalQuestions > 0 && correctCount === totalQuestions
}

export function scoreDailyQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): { correctCount: number; totalQuestions: number } {
  let correctCount = 0
  for (const q of questions) {
    const a = answers[q.id]
    if (a !== undefined && a === q.correctAnswer) correctCount++
  }
  return { correctCount, totalQuestions: questions.length }
}

/** Consecutive UTC days with `passed: true` ending at `endDate` (inclusive). */
export function countPassStreakEndingAtFromMap(
  dateToPassed: Map<string, boolean>,
  endDate: string
): number {
  let cursor = endDate
  let streak = 0
  for (;;) {
    if (dateToPassed.get(cursor) !== true) break
    streak++
    cursor = previousUtcDateString(cursor)
  }
  return streak
}

/**
 * Same rules as the quiz UI / auth/me: today failed → 0; today passed → chain from today;
 * no row today → chain ending yesterday.
 */
export function computeDisplayCurrentStreakFromMap(
  dateToPassed: Map<string, boolean>,
  today: string
): number {
  const todayPassed = dateToPassed.get(today)
  if (todayPassed === false) return 0
  if (todayPassed === true) {
    return countPassStreakEndingAtFromMap(dateToPassed, today)
  }
  return countPassStreakEndingAtFromMap(dateToPassed, previousUtcDateString(today))
}

function computeLongestPassStreakFromSortedPassedDates(sortedAsc: string[]): number {
  if (sortedAsc.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1]
    const curr = sortedAsc[i]
    if (nextUtcDateString(prev) === curr) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

function longestPassStreakFromRows(rows: { quizDate: string; passed: boolean }[]): number {
  const passedDates = rows
    .filter((r) => r.passed)
    .map((r) => r.quizDate)
    .sort()
  return computeLongestPassStreakFromSortedPassedDates(passedDates)
}

export type QuizStreakSummary = {
  currentStreak: number
  longestStreak: number
}

/**
 * Display streak: UTC "today" row failed → 0; if today passed → chain including today;
 * if today not submitted yet → chain ending yesterday (still "alive").
 */
export async function getQuizStreakSummary(userId: string): Promise<QuizStreakSummary> {
  const rows = await prisma.dailyQuizResult.findMany({
    where: { userId },
    select: { quizDate: true, passed: true },
  })
  const dateToPassed = new Map(rows.map((r) => [r.quizDate, r.passed]))
  const today = utcTodayString()
  return {
    currentStreak: computeDisplayCurrentStreakFromMap(dateToPassed, today),
    longestStreak: longestPassStreakFromRows(rows),
  }
}

export type CompleteDailyQuizResult = {
  correctCount: number
  total: number
  passed: boolean
  streak: number
  longestStreak: number
}

export async function completeDailyQuiz(
  userId: string,
  quizDate: string,
  answers: Record<string, string>
): Promise<CompleteDailyQuizResult> {
  if (!isValidQuizDateParam(quizDate)) {
    throw new Error('INVALID_DATE')
  }
  if (quizDate > utcTodayString()) {
    throw new Error('FUTURE_DATE')
  }

  const { date, questions } = await getDailyQuestions(quizDate)
  if (questions.length === 0) {
    throw new Error('NO_QUESTIONS')
  }

  const { correctCount, totalQuestions } = scoreDailyQuiz(questions, answers)
  const passed = isStreakSuccess(correctCount, totalQuestions)

  await prisma.dailyQuizResult.upsert({
    where: { userId_quizDate: { userId, quizDate: date } },
    create: {
      userId,
      quizDate: date,
      correctCount,
      totalQuestions,
      passed,
    },
    update: {
      correctCount,
      totalQuestions,
      passed,
    },
  })

  const rowsAfter = await prisma.dailyQuizResult.findMany({
    where: { userId },
    select: { quizDate: true, passed: true },
  })
  const map = new Map(rowsAfter.map((r) => [r.quizDate, r.passed]))
  const streak = passed ? countPassStreakEndingAtFromMap(map, date) : 0
  const longestStreak = longestPassStreakFromRows(rowsAfter)

  return {
    correctCount,
    total: totalQuestions,
    passed,
    streak,
    longestStreak,
  }
}
