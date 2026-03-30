"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { QuizBuilder } from "@/components/quiz/QuizBuilder"
import type { QuestionData } from "@/components/quiz/QuestionEditor"

interface CustomQuizFull {
  id: string
  title: string
  description: string | null
  isPublic: boolean
  userId: string
  questions: {
    id: string
    prompt: string
    options: unknown
    correctAnswer: string
    context?: string | null
    order: number
  }[]
}

const CURRENT_USER_ID = 'temp-user-id'

export default function EditCustomQuizPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quiz, setQuiz] = useState<CustomQuizFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/custom-quizzes/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load')
        return r.json()
      })
      .then((data: CustomQuizFull) => {
        if (data.userId !== CURRENT_USER_ID) {
          router.replace('/quiz/custom')
          return
        }
        setQuiz(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSave = async (data: { title: string; description?: string; isPublic: boolean; questions: QuestionData[] }) => {
    if (!quiz) return
    setSaving(true)
    try {
      // Update quiz metadata
      const metaRes = await fetch(`/api/custom-quizzes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, description: data.description, isPublic: data.isPublic }),
      })
      if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? 'Failed to update quiz')

      // Delete all existing questions and re-create (simplest approach for edit)
      for (const q of quiz.questions) {
        const delRes = await fetch(`/api/custom-quizzes/${id}/questions/${q.id}`, { method: 'DELETE' })
        if (!delRes.ok && delRes.status !== 404) {
          throw new Error('Failed to remove existing question — save aborted')
        }
      }
      for (const [i, q] of data.questions.entries()) {
        const qRes = await fetch(`/api/custom-quizzes/${id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...q, order: i }),
        })
        if (!qRes.ok) throw new Error((await qRes.json()).error ?? 'Failed to save question')
      }

      router.push(`/quiz/custom/${id}`)
    } catch (e) {
      throw e
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!quiz) return null

  const initialData = {
    title: quiz.title,
    description: quiz.description ?? undefined,
    isPublic: quiz.isPublic,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options as string[],
      correctAnswer: q.correctAnswer,
      context: q.context ?? undefined,
    })),
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Quiz</h1>
      <QuizBuilder initialData={initialData} onSave={handleSave} saving={saving} />
    </div>
  )
}
