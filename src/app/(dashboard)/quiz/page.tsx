"use client"

import { useState } from "react"
import type { QuizQuestionsResponse } from "@/types"

type QuizState = "start" | "questions" | "results"

export default function QuizPage() {
  const [state, setState] = useState<QuizState>("start")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QuizQuestionsResponse | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const today = new Date().toISOString().slice(0, 10)
  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-")
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day))
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }

  const startQuiz = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/questions?date=${today}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load questions")
      }
      const result: QuizQuestionsResponse = await res.json()
      setData(result)
      setState("questions")
      setCurrentIndex(0)
      setAnswers({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const goNext = () => {
    if (!data || currentIndex >= data.questions.length - 1) {
      setState("results")
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const score = data
    ? data.questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0
  const total = data?.questions.length ?? 0

  if (state === "start") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Daily Challenge</h1>
        <p className="text-muted-foreground mb-2">
          Test your knowledge of financial statements and stock performance.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          {formatDate(today)}
        </p>
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}
        <button
          onClick={startQuiz}
          disabled={loading}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Start Today's Challenge"}
        </button>
      </div>
    )
  }

  if (state === "questions" && data && data.questions.length > 0) {
    const q = data.questions[currentIndex]
    const hasAnswer = !!answers[q.id]
    const isLast = currentIndex === data.questions.length - 1

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-sm text-muted-foreground">
          Question {currentIndex + 1} of {data.questions.length}
        </div>
        <div className="border rounded-lg p-6 mb-8">
          {q.context && (
            <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">{q.context}</p>
            </div>
          )}
          <h2 className="text-xl font-semibold mb-6">{q.prompt}</h2>
          <div className="space-y-3">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => selectAnswer(q.id, opt)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasAnswer}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLast ? "See Results" : "Next"}
          </button>
        </div>
      </div>
    )
  }

  if (state === "questions" && data && data.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">No questions today</h1>
        <p className="text-muted-foreground">
          The quiz dataset may not be ready. Build the report matchup data first.
        </p>
      </div>
    )
  }

  if (state === "results" && data) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Challenge Complete</h1>
        <p className="text-muted-foreground mb-8">
          You got {score} out of {total} correct
        </p>
        <div className="space-y-6 mb-10">
          {data.questions.map((q) => {
            const userAnswer = answers[q.id]
            const isCorrect = userAnswer === q.correctAnswer
            return (
              <div
                key={q.id}
                className={`border rounded-lg p-4 ${
                  isCorrect ? "border-green-500/50 bg-green-50/50" : "border-red-500/50 bg-red-50/50"
                }`}
              >
                <p className="font-medium mb-2">{q.prompt}</p>
                <p className="text-sm">
                  Your answer: {userAnswer || "—"}
                  {!isCorrect && (
                    <span className="text-green-700 ml-2">Correct: {q.correctAnswer}</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-center text-muted-foreground">
          Come back tomorrow for a new challenge
        </p>
      </div>
    )
  }

  return null
}
