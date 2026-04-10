'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { QuestionType, type SessionQuestion } from '@/types/quiz.types'

type AnswerData = { option_id?: number; option_ids?: number[]; text?: string }

type Props = {
  question: SessionQuestion
  onSubmit: (answerData: AnswerData) => void
  disabled: boolean
}

export function QuizQuestionView({ question, onSubmit, disabled }: Props) {
  const t = useTranslations('quizzes')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [textAnswer, setTextAnswer] = useState('')

  // Reset local state when question changes
  // (parent remounts this on each new question via key prop)

  const canSubmit = (() => {
    if (question.type === QuestionType.SingleChoice) return selectedId !== null
    if (question.type === QuestionType.MultiChoice) return selectedIds.size > 0
    if (question.type === QuestionType.FillBlank) return textAnswer.trim().length > 0
    return false
  })()

  function handleSubmit() {
    if (!canSubmit || disabled) return
    if (question.type === QuestionType.SingleChoice && selectedId !== null) {
      onSubmit({ option_id: selectedId })
    } else if (question.type === QuestionType.MultiChoice) {
      onSubmit({ option_ids: Array.from(selectedIds) })
    } else if (question.type === QuestionType.FillBlank) {
      onSubmit({ text: textAnswer.trim() })
    }
  }

  const questionText = (question.content as { text?: string }).text ?? ''

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium leading-relaxed">{questionText}</p>

      {question.type === QuestionType.SingleChoice && question.options ? (
        <RadioGroup
          value={selectedId !== null ? String(selectedId) : ''}
          onValueChange={(val) => setSelectedId(Number(val))}
          disabled={disabled}
          className="space-y-3"
        >
          {[...question.options]
            .sort((a, b) => a.position - b.position)
            .map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 rounded-md border p-3">
                <RadioGroupItem value={String(opt.id)} id={`opt-${opt.id}`} />
                <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer text-sm">
                  {opt.content}
                </Label>
              </div>
            ))}
        </RadioGroup>
      ) : null}

      {question.type === QuestionType.MultiChoice && question.options ? (
        <div className="space-y-3">
          {[...question.options]
            .sort((a, b) => a.position - b.position)
            .map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 rounded-md border p-3">
                <Checkbox
                  id={`opt-${opt.id}`}
                  checked={selectedIds.has(opt.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (checked) {
                        next.add(opt.id)
                      } else {
                        next.delete(opt.id)
                      }
                      return next
                    })
                  }}
                />
                <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer text-sm">
                  {opt.content}
                </Label>
              </div>
            ))}
        </div>
      ) : null}

      {question.type === QuestionType.FillBlank ? (
        <Input
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
        />
      ) : null}

      <Button onClick={handleSubmit} disabled={!canSubmit || disabled} className="w-full">
        {t('session.submitAnswer')}
      </Button>
    </div>
  )
}
