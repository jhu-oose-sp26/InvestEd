export type QuizQuestionCategory =
  | 'profitability'
  | 'cash_flow'
  | 'comparison'
  | 'stock_implications'
  | 'concept'

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
