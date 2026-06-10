'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { SessionQuestion, WsAnswerResultEvent } from '@/types/quiz.types'

type Props = {
  result: WsAnswerResultEvent
  /** The question just answered, used to resolve correct option labels. */
  question?: SessionQuestion | null
  onNext: () => void
}

/**
 * Renders the human-readable correct answer from the WS `correct_answer`
 * payload ({option_id} | {option_ids} | {text}). Choice options are mapped to
 * their text via the question's options; fill-blank shows the accepted text.
 */
function resolveCorrectAnswerText(
  correctAnswer: Record<string, unknown> | undefined,
  question?: SessionQuestion | null
): string {
  if (!correctAnswer) return ''

  const optionLabel = (id: unknown): string => {
    const match = question?.options?.find((o) => o.id === id)
    return match ? match.content : String(id)
  }

  if (typeof correctAnswer.text === 'string' && correctAnswer.text.trim()) {
    return correctAnswer.text
  }
  if (typeof correctAnswer.option_id === 'number') {
    return optionLabel(correctAnswer.option_id)
  }
  if (Array.isArray(correctAnswer.option_ids)) {
    return correctAnswer.option_ids.map(optionLabel).join(', ')
  }
  return ''
}

export function QuizAnswerResultCard({ result, question, onNext }: Props) {
  const t = useTranslations('quizzes')
  const correctAnswerText = resolveCorrectAnswerText(result.correct_answer, question)

  return (
    <Card className={result.is_correct ? 'border-green-500' : 'border-red-500'}>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <Badge variant={result.is_correct ? 'default' : 'destructive'} className="text-sm">
            {result.is_correct ? t('session.correct') : t('session.incorrect')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('session.score', { score: result.score_obtained })}
          </span>
        </div>

        {!result.is_correct && correctAnswerText ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('session.correctAnswer')}
            </p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">{correctAnswerText}</p>
          </div>
        ) : null}

        {result.explanation ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('session.explanation')}
            </p>
            <p className="text-sm">{result.explanation}</p>
          </div>
        ) : null}

        <Button onClick={onNext} className="w-full">
          {t('session.next')}
        </Button>
      </CardContent>
    </Card>
  )
}
