'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WsFinishEvent } from '@/types/quiz.types'

type Props = {
  data: WsFinishEvent
  quizId: number
  locale: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function QuizFinishScreen({ data, quizId, locale }: Props) {
  const t = useTranslations('quizzes')
  const router = useRouter()

  function handleTryAgain() {
    const restart = Date.now()
    router.replace(`/${locale}/quizzes/${quizId}/session?restart=${restart}`)
  }

  const scorePercent = data.max_score > 0
    ? Math.round((data.total_score / data.max_score) * 100)
    : 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('session.finish.title')}</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('session.finish.score')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('session.finish.score')}</dt>
              <dd className="text-2xl font-bold">{data.total_score}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('session.finish.maxScore')}</dt>
              <dd className="text-2xl font-bold">{data.max_score}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">%</dt>
              <dd className="text-2xl font-bold">{scorePercent}%</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('session.finish.duration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatDuration(data.duration_sec)}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/${locale}/quizzes/${quizId}`}>{t('session.finish.backToDetail')}</Link>
        </Button>
        <Button onClick={handleTryAgain}>{t('session.finish.tryAgain')}</Button>
      </div>
    </div>
  )
}
