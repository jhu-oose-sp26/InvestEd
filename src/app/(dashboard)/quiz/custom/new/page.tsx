"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { QuizBuilder } from "@/components/quiz/QuizBuilder"
import type { QuestionData } from "@/components/quiz/QuestionEditor"

export default function NewCustomQuizPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: { title: string; description?: string; isPublic: boolean; questions: QuestionData[] }) => {
    setSaving(true)
    try {
      const quizRes = await fetch('/api/custom-quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, description: data.description, isPublic: data.isPublic }),
      })
      if (!quizRes.ok) throw new Error((await quizRes.json()).error ?? 'Failed to create quiz')
      const quiz = await quizRes.json()

      for (const q of data.questions) {
        const qRes = await fetch(`/api/custom-quizzes/${quiz.id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q),
        })
        if (!qRes.ok) throw new Error((await qRes.json()).error ?? 'Failed to add question')
      }

      router.push(`/quiz/custom/${quiz.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Create Quiz</h1>
      <QuizBuilder onSave={handleSave} saving={saving} />
    </div>
  )
}
