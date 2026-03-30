"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface QuizSummary {
  id: string
  title: string
  description: string | null
  isPublic: boolean
  userId: string
  createdAt: string
  _count: { questions: number }
  user: { name: string | null }
}

const CURRENT_USER_ID = 'temp-user-id'

export default function CustomQuizListPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/custom-quizzes')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuizzes(data)
        else setError('Failed to load quizzes')
      })
      .catch(() => setError('Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Custom Quizzes</h1>
        <Link
          href="/quiz/custom/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
        >
          Create Quiz
        </Link>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && quizzes.length === 0 && (
        <p className="text-muted-foreground">No quizzes yet. Create the first one!</p>
      )}

      <div className="space-y-3">
        {quizzes.map((quiz) => (
          <Link
            key={quiz.id}
            href={`/quiz/custom/${quiz.id}`}
            className="block border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{quiz.title}</h2>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quiz.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {quiz._count.questions} question{quiz._count.questions !== 1 ? 's' : ''} ·{' '}
                  {quiz.userId === CURRENT_USER_ID ? 'You' : (quiz.user.name ?? 'Unknown')} ·{' '}
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full border ${
                quiz.isPublic
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : 'border-gray-300 text-gray-500 bg-gray-50'
              }`}>
                {quiz.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
