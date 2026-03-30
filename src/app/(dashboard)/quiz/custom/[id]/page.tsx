"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  correctAnswer: string
  context?: string | null
}

interface CustomQuizFull {
  id: string
  title: string
  description: string | null
  isPublic: boolean
  userId: string
  questions: QuizQuestion[]
}

type QuizState = "start" | "questions" | "results"

const CURRENT_USER_ID = 'temp-user-id'

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function TakeCustomQuizPage() {
  const { id } = useParams<{ id: string }>()
  const [quiz, setQuiz] = useState<CustomQuizFull | null>(null)
  const [shuffledQuestions, setShuffledQuestions] = useState<(QuizQuestion & { shuffledOptions: string[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<QuizState>("start")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/custom-quizzes/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load')
        return r.json()
      })
      .then((data: CustomQuizFull) => {
        setQuiz(data)
        setShuffledQuestions(
          data.questions.map((q) => ({ ...q, shuffledOptions: shuffled(q.options as string[]) }))
        )
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-muted-foreground">Loading...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!quiz) return null

  const isOwner = quiz.userId === CURRENT_USER_ID
  const total = shuffledQuestions.length
  const score = shuffledQuestions.filter((q) => answers[q.id] === q.correctAnswer).length

  if (state === "start") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
        {quiz.description && <p className="text-muted-foreground mb-6">{quiz.description}</p>}
        <p className="text-sm text-muted-foreground mb-8">{total} question{total !== 1 ? 's' : ''}</p>
        {total === 0 && (
          <p className="text-muted-foreground mb-6">This quiz has no questions yet.</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setState("questions")}
            disabled={total === 0}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
          {isOwner && (
            <Link
              href={`/quiz/custom/${id}/edit`}
              className="px-4 py-3 border rounded-md hover:bg-muted transition-colors text-sm"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (state === "questions" && shuffledQuestions.length > 0) {
    const q = shuffledQuestions[currentIndex]
    const isLast = currentIndex === total - 1

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-sm text-muted-foreground">
          Question {currentIndex + 1} of {total}
        </div>
        <div className="border rounded-lg p-6 mb-8">
          {q.context && (
            <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border
                            prose prose-sm prose-slate max-w-none dark:prose-invert
                            prose-table:w-full prose-th:text-left prose-th:font-semibold
                            prose-td:py-1 prose-th:py-1 prose-p:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.context}</ReactMarkdown>
            </div>
          )}
          <h2 className="text-xl font-semibold mb-6">{q.prompt}</h2>
          <div className="space-y-3">
            {q.shuffledOptions.map((opt) => {
              const selected = answers[q.id] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-between">
          <button type="button" onClick={() => setCurrentIndex((i) => i - 1)} disabled={currentIndex === 0}
            className="px-4 py-2 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
          <button type="button" onClick={() => isLast ? setState("results") : setCurrentIndex((i) => i + 1)}
            disabled={!answers[q.id]}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLast ? 'See Results' : 'Next'}
          </button>
        </div>
      </div>
    )
  }

  if (state === "results") {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Results</h1>
        <p className="text-muted-foreground mb-8">You got {score} out of {total} correct</p>
        <div className="space-y-4 mb-10">
          {shuffledQuestions.map((q) => {
            const isCorrect = answers[q.id] === q.correctAnswer
            return (
              <div key={q.id} className={`border rounded-lg p-4 ${isCorrect ? 'border-green-500/50 bg-green-50/50' : 'border-red-500/50 bg-red-50/50'}`}>
                <p className="font-medium mb-1">{q.prompt}</p>
                <p className="text-sm">
                  Your answer: {answers[q.id] || '—'}
                  {!isCorrect && <span className="text-green-700 ml-2">Correct: {q.correctAnswer}</span>}
                </p>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setAnswers({}); setCurrentIndex(0); setState("start") }}
            className="px-4 py-2 border rounded-md hover:bg-muted text-sm">
            Try Again
          </button>
          <Link href="/quiz/custom" className="px-4 py-2 border rounded-md hover:bg-muted text-sm">
            All Quizzes
          </Link>
        </div>
      </div>
    )
  }

  return null
}
