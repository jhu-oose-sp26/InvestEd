"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { QuizQuestionsResponse, QuizCompleteResponse } from "@/types"
import { usePaperTradingAuth } from "@/contexts/PaperTradingAuthContext"

type QuizState = "start" | "questions" | "results"

export default function QuizPage() {
  const { user, quizStreak, refreshQuizStreak } = usePaperTradingAuth()
  const [state, setState] = useState<QuizState>("start")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QuizQuestionsResponse | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [serverResult, setServerResult] = useState<QuizCompleteResponse | null>(null)
  const [streakSubmitting, setStreakSubmitting] = useState(false)
  const [streakError, setStreakError] = useState<string | null>(null)
  const submitCompleteRef = useRef(false)

  useEffect(() => {
    if (state === "start") {
      submitCompleteRef.current = false
      setServerResult(null)
      setStreakError(null)
    }
  }, [state])

  useEffect(() => {
    if (state !== "results" || !data) return
    if (!user) return
    if (submitCompleteRef.current) return
    submitCompleteRef.current = true
    setStreakSubmitting(true)
    setStreakError(null)
    ;(async () => {
      try {
        const res = await fetch("/api/quiz/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: data.date, answers }),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string } & Partial<QuizCompleteResponse>
        if (!res.ok) {
          throw new Error(typeof j.error === "string" ? j.error : "Could not save result")
        }
        setServerResult(j as QuizCompleteResponse)
        await refreshQuizStreak()
      } catch (e) {
        setStreakError(e instanceof Error ? e.message : "Could not save result")
        submitCompleteRef.current = false
      } finally {
        setStreakSubmitting(false)
      }
    })()
  }, [state, data, user, answers, refreshQuizStreak])

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
        {user && quizStreak && (
          <p className="text-sm text-muted-foreground mb-6">
            Streak:{" "}
            <span className="font-semibold text-foreground">{quizStreak.currentStreak}</span>
            {" · "}
            Best: {quizStreak.longestStreak}
          </p>
        )}
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
        <div className="mt-10 pt-8 border-t border-border max-w-md mx-auto">
          <p className="text-sm text-muted-foreground mb-3">Build quizzes from your own reports.</p>
          <Link
            href="/quiz/custom"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Custom Quizzes
          </Link>
        </div>
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
              {q.category === 'statement_reading' ? (
                <div className="prose prose-sm prose-slate max-w-none dark:prose-invert
                                prose-table:w-full prose-th:text-left prose-th:font-semibold
                                prose-td:py-1 prose-th:py-1 prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.context}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{q.context}</p>
              )}
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
        <p className="text-muted-foreground mb-8">
          The quiz dataset may not be ready. Build the report matchup data first.
        </p>
        <Link
          href="/quiz/custom"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Custom Quizzes
        </Link>
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
        <div className="mb-8 space-y-3">
          {user ? (
            streakSubmitting ? (
              <p className="text-sm text-muted-foreground text-center">Saving your result…</p>
            ) : streakError ? (
              <p className="text-sm text-red-600 text-center">{streakError}</p>
            ) : serverResult ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                <p className="font-medium">
                  {serverResult.passed ? (
                    <>
                      Streak: <strong>{serverResult.streak}</strong> day
                      {serverResult.streak !== 1 ? "s" : ""} (all correct)
                    </>
                  ) : (
                    <>Streak unchanged — get every question right to earn a streak day.</>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Best streak: {serverResult.longestStreak}
                </p>
              </div>
            ) : null
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/" className="text-primary underline underline-offset-2">
                Sign in
              </Link>{" "}
              to track your daily streak.
            </p>
          )}
        </div>
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
        <p className="text-center text-muted-foreground mb-6">
          Come back tomorrow for a new challenge
        </p>
        <div className="text-center">
          <Link
            href="/quiz/custom"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Custom Quizzes
          </Link>
        </div>
      </div>
    )
  }

  return null
}
