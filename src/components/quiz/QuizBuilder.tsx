"use client"

import { useState } from "react"
import { QuestionEditor, type QuestionData } from "./QuestionEditor"

function blankQuestion(): QuestionData {
  return { prompt: '', options: ['', '', '', ''], correctAnswer: '' }
}

function validateForm(title: string, questions: QuestionData[]): string | null {
  if (!title.trim()) return 'Quiz title is required.'
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.prompt.trim()) return `Question ${i + 1}: prompt is required.`
    if (q.options.some((o) => !o.trim())) return `Question ${i + 1}: all four options are required.`
    if (!q.correctAnswer) return `Question ${i + 1}: select the correct answer.`
    if (!q.options.includes(q.correctAnswer)) return `Question ${i + 1}: correct answer must match one of the options.`
  }
  return null
}

interface QuizBuilderProps {
  initialData?: { title: string; description?: string; isPublic: boolean; questions: QuestionData[] }
  onSave: (data: { title: string; description?: string; isPublic: boolean; questions: QuestionData[] }) => Promise<void>
  saving?: boolean
}

export function QuizBuilder({ initialData, onSave, saving }: QuizBuilderProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false)
  const [questions, setQuestions] = useState<QuestionData[]>(
    initialData?.questions.length ? initialData.questions : [blankQuestion()]
  )
  const [error, setError] = useState<string | null>(null)

  const updateQuestion = (i: number, q: QuestionData) =>
    setQuestions((prev) => prev.map((old, idx) => (idx === i ? q : old)))

  const removeQuestion = (i: number) =>
    setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  const moveQuestion = (i: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return next
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const handleSave = async () => {
    setError(null)
    const validationError = validateForm(title, questions)
    if (validationError) { setError(validationError); return }
    try {
      await onSave({ title, description: description || undefined, isPublic, questions })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Quiz title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isPublic" className="text-sm font-medium">Make this quiz public</label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Questions</h2>
        {questions.map((q, i) => (
          <QuestionEditor
            key={i}
            index={i}
            question={q}
            total={questions.length}
            onChange={(updated) => updateQuestion(i, updated)}
            onRemove={() => removeQuestion(i)}
            onMoveUp={() => moveQuestion(i, -1)}
            onMoveDown={() => moveQuestion(i, 1)}
          />
        ))}
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}
          className="w-full py-2 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Add Question
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Quiz'}
        </button>
      </div>
    </div>
  )
}
