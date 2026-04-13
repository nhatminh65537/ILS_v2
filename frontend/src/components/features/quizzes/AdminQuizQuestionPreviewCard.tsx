'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuestionType, type QuizQuestion, type SessionQuestion } from '@/types/quiz.types'
import { QuizQuestionView } from './QuizQuestionView'

type AdminQuizQuestionPreviewCardProps = {
  question: QuizQuestion
}

export function AdminQuizQuestionPreviewCard({ question }: AdminQuizQuestionPreviewCardProps) {
  const t = useTranslations('adminQuizzes')

  const sessionQuestion: SessionQuestion = useMemo(() => {
    const text = String(question.content?.text ?? '')
    return {
      id: question.id,
      type: question.question_type,
      content: { text },
      options:
        question.question_type === QuestionType.FillBlank
          ? undefined
          : (question.options ?? []).map((option) => ({
              id: option.id,
              content: option.content,
              position: option.position,
            })),
    }
  }, [question])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('questions.previewTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('questions.previewHint')}</p>
        <QuizQuestionView disabled onSubmit={() => undefined} question={sessionQuestion} />
      </CardContent>
    </Card>
  )
}
