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

export async function countPassStreakEndingAt(userId: string, endDate: string): Promise<number> {
  let cursor = endDate
  let streak = 0
  for (;;) {
    const row = await prisma.dailyQuizResult.findUnique({
      where: { userId_quizDate: { userId, quizDate: cursor } },
      select: { passed: true },
    })
    if (!row?.passed) break
    streak++
    cursor = previousUtcDateString(cursor)
  }
  return streak
}

async function computeLongestPassStreak(userId: string): Promise<number> {
  const rows = await prisma.dailyQuizResult.findMany({
    where: { userId, passed: true },
    select: { quizDate: true },
    orderBy: { quizDate: 'asc' },
  })
  if (rows.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].quizDate
    const curr = rows[i].quizDate
    if (nextUtcDateString(prev) === curr) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
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
  const today = utcTodayString()
  const todayRow = await prisma.dailyQuizResult.findUnique({
    where: { userId_quizDate: { userId, quizDate: today } },
    select: { passed: true },
  })
  const longestStreak = await computeLongestPassStreak(userId)

  if (todayRow?.passed === false) {
    return { currentStreak: 0, longestStreak }
  }
  if (todayRow?.passed === true) {
    return {
      currentStreak: await countPassStreakEndingAt(userId, today),
      longestStreak,
    }
  }
  return {
    currentStreak: await countPassStreakEndingAt(userId, previousUtcDateString(today)),
    longestStreak,
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

  const streak = passed ? await countPassStreakEndingAt(userId, date) : 0
  const longestStreak = await computeLongestPassStreak(userId)

  return {
    correctCount,
    total: totalQuestions,
    passed,
    streak,
    longestStreak,
  }
}
