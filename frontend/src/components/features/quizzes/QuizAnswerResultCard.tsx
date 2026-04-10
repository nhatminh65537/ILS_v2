'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { WsAnswerResultEvent } from '@/types/quiz.types'

type Props = {
  result: WsAnswerResultEvent
  onNext: () => void
}

export function QuizAnswerResultCard({ result, onNext }: Props) {
  const t = useTranslations('quizzes')

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
