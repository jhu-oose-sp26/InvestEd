export type QuizQuestionCategory =
  | 'profitability'
  | 'cash_flow'
  | 'comparison'
  | 'stock_implications'
  | 'concept'
  | 'statement_reading'

export interface QuizQuestion {
  id: string
  category: QuizQuestionCategory
  type: 'interpretation' | 'concept'
  context?: string
  prompt: string
  options: string[]
  correctAnswer: string
  quarter?: string
}

export interface QuizQuestionsResponse {
  date: string
  questions: QuizQuestion[]
}

/** POST /api/quiz/complete — server-verified score and streak */
export interface QuizCompleteResponse {
  correctCount: number
  total: number
  passed: boolean
  streak: number
  longestStreak: number
}

/** GET /api/leaderboard/streaks — global ranking by display current streak */
export interface StreakLeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  currentStreak: number
}
