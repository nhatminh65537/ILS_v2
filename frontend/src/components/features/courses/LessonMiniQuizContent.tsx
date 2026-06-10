'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { deriveMiniquizSignal } from '@/lib/lesson-completion'
import { revealLearnLessonQuestion } from '@/services/lessons.service'
import { QuestionType } from '@/types/quiz.types'
import type {
  LearnLessonQuestionMapping,
  LearnLessonQuestionReveal,
  LessonCompletionSignal,
  MiniquizAnswerState,
} from '@/types/lesson.types'

type LessonMiniQuizContentProps = {
  mappings: readonly LearnLessonQuestionMapping[]
  onSignalChange: (signal: LessonCompletionSignal) => void
}

const toQuestionText = (content: Record<string, unknown>): string => {
  const value = content.text
  return typeof value === 'string' ? value : ''
}

export function LessonMiniQuizContent({ mappings, onSignalChange }: LessonMiniQuizContentProps) {
  const t = useTranslations('courses.lessonViewer')
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<number, MiniquizAnswerState>>({})
  // Correct answers are resolved server-side on reveal (never shipped in the
  // initial mapping payload), keyed by question id.
  const [revealByQuestionId, setRevealByQuestionId] = useState<Record<number, LearnLessonQuestionReveal>>({})

  const orderedMappings = useMemo(
    () => [...mappings].sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id)),
    [mappings]
  )

  const answeredCount = useMemo(
    () =>
      orderedMappings.filter((mapping) => {
        const state = answersByQuestionId[mapping.question.id]
        return state?.revealed === true
      }).length,
    [answersByQuestionId, orderedMappings]
  )

  useEffect(() => {
    onSignalChange(deriveMiniquizSignal(answeredCount, orderedMappings.length))
  }, [answeredCount, onSignalChange, orderedMappings.length])

  if (orderedMappings.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('miniquizEmpty')}</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('miniquizHint')}</p>
      {orderedMappings.map((mapping, index) => {
        const question = mapping.question
        const questionId = question.id
        const state = answersByQuestionId[questionId] ?? { revealed: false }
        const questionText = toQuestionText(question.content)
        const isSingle = question.question_type === QuestionType.SingleChoice
        const isMulti = question.question_type === QuestionType.MultiChoice
        const isFillBlank = question.question_type === QuestionType.FillBlank

        const canReveal = (() => {
          if (isSingle) {
            return typeof state.selectedOptionId === 'number'
          }
          if (isMulti) {
            return Array.isArray(state.selectedOptionIds) && state.selectedOptionIds.length > 0
          }
          if (isFillBlank) {
            return typeof state.textAnswer === 'string' && state.textAnswer.trim().length > 0
          }
          return false
        })()

        return (
          <Card key={mapping.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('questionLabel', { index: index + 1 })}: {questionText}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSingle && question.options ? (
                <RadioGroup
                  value={typeof state.selectedOptionId === 'number' ? String(state.selectedOptionId) : ''}
                  onValueChange={(value) => {
                    const parsed = Number(value)
                    setAnswersByQuestionId((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...state,
                        selectedOptionId: Number.isFinite(parsed) ? parsed : undefined,
                        revealed: false,
                      },
                    }))
                  }}
                >
                  {[...question.options]
                    .sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))
                    .map((option) => (
                      <div key={option.id} className="flex items-center gap-2 rounded-md border p-3">
                        <RadioGroupItem value={String(option.id)} id={`lesson-q-${questionId}-opt-${option.id}`} />
                        <Label htmlFor={`lesson-q-${questionId}-opt-${option.id}`}>{option.content}</Label>
                      </div>
                    ))}
                </RadioGroup>
              ) : null}

              {isMulti && question.options ? (
                <div className="space-y-2">
                  {[...question.options]
                    .sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))
                    .map((option) => {
                      const selectedOptionIds = state.selectedOptionIds ? [...state.selectedOptionIds] : []
                      const isChecked = selectedOptionIds.includes(option.id)

                      return (
                        <div key={option.id} className="flex items-center gap-2 rounded-md border p-3">
                          <Checkbox
                            id={`lesson-q-${questionId}-opt-${option.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedOptionIds)
                              if (checked) {
                                next.add(option.id)
                              } else {
                                next.delete(option.id)
                              }

                              setAnswersByQuestionId((prev) => ({
                                ...prev,
                                [questionId]: {
                                  ...state,
                                  selectedOptionIds: [...next],
                                  revealed: false,
                                },
                              }))
                            }}
                          />
                          <Label htmlFor={`lesson-q-${questionId}-opt-${option.id}`}>{option.content}</Label>
                        </div>
                      )
                    })}
                </div>
              ) : null}

              {isFillBlank ? (
                <Input
                  value={state.textAnswer ?? ''}
                  onChange={(event) => {
                    setAnswersByQuestionId((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...state,
                        textAnswer: event.target.value,
                        revealed: false,
                      },
                    }))
                  }}
                  placeholder={t('fillBlankPlaceholder')}
                />
              ) : null}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  disabled={!canReveal}
                  onClick={() => {
                    setAnswersByQuestionId((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...state,
                        revealed: true,
                      },
                    }))
                    // Fetch the correct answer server-side (once per question).
                    if (!revealByQuestionId[questionId]) {
                      void revealLearnLessonQuestion(mapping.lesson, questionId)
                        .then((data) => {
                          setRevealByQuestionId((prev) => ({ ...prev, [questionId]: data }))
                        })
                        .catch(() => {
                          /* keep the explanation-only fallback below on failure */
                        })
                    }
                  }}
                >
                  {t('revealButton')}
                </Button>

                {state.revealed ? <span className="text-sm text-muted-foreground">{t('answered')}</span> : null}
              </div>

              {state.revealed ? (
                <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
                  {(() => {
                    const reveal = revealByQuestionId[questionId]
                    if (!reveal) return null
                    const correctText =
                      reveal.correct_options.length > 0
                        ? reveal.correct_options.map((o) => o.content).join(', ')
                        : reveal.accepted_answers.join(', ')
                    if (!correctText) return null
                    return (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('correctAnswer')}
                        </p>
                        <p className="font-medium text-green-600 dark:text-green-400">{correctText}</p>
                      </div>
                    )
                  })()}
                  <p>{question.explanation ? question.explanation : t('noExplanation')}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
