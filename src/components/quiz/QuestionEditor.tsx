"use client"

import { useState } from "react"
import { ReportPicker } from "./ReportPicker"

export interface QuestionData {
  id?: string
  prompt: string
  options: string[]
  correctAnswer: string
  context?: string
}

interface QuestionEditorProps {
  index: number
  question: QuestionData
  total: number
  onChange: (q: QuestionData) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function QuestionEditor({ index, question, total, onChange, onRemove, onMoveUp, onMoveDown }: QuestionEditorProps) {
  const [showReportPicker, setShowReportPicker] = useState(false)

  const setOption = (i: number, value: string) => {
    const options = [...question.options]
    const wasCorrect = question.correctAnswer === options[i]
    options[i] = value
    onChange({ ...question, options, correctAnswer: wasCorrect ? value : question.correctAnswer })
  }

  const insertContext = (markdown: string) => {
    const existing = question.context?.trim()
    const updated = existing ? `${existing}\n\n${markdown}` : markdown
    onChange({ ...question, context: updated })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Question {index + 1}</span>
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-40">↑</button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-40">↓</button>
          <button type="button" onClick={onRemove} disabled={total === 1}
            className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40">
            Remove
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Prompt *</label>
        <textarea
          value={question.prompt}
          onChange={(e) => onChange({ ...question, prompt: e.target.value })}
          rows={2}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Enter your question..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Context (optional)</label>
          <button
            type="button"
            onClick={() => setShowReportPicker((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showReportPicker ? "Hide report data" : "Insert from financial report"}
          </button>
        </div>
        <textarea
          value={question.context ?? ''}
          onChange={(e) => onChange({ ...question, context: e.target.value })}
          rows={question.context && question.context.length > 100 ? 6 : 2}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          placeholder="Optional background context shown above the question..."
        />
        {showReportPicker && (
          <div className="mt-2">
            <ReportPicker onInsertContext={insertContext} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Answer Options * <span className="text-muted-foreground font-normal">(select the correct one)</span></label>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={question.correctAnswer === opt}
                onChange={() => onChange({ ...question, correctAnswer: opt })}
                className="shrink-0"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={`Option ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
