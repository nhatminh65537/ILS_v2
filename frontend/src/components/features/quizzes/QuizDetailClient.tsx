'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuizzes } from '@/hooks/useQuizzes'
import { ContentStatus } from '@/types/quiz.types'

type QuizDetailClientProps = {
  id: number
  locale: string
}

const STATUS_VARIANT: Record<ContentStatus, 'default' | 'secondary' | 'outline'> = {
  [ContentStatus.Published]: 'default',
  [ContentStatus.Draft]: 'secondary',
  [ContentStatus.Archived]: 'outline',
}

export function QuizDetailClient({ id, locale }: QuizDetailClientProps) {
  const t = useTranslations('quizzes')
  const { selectedQuiz, progress, isLoading, error, loadQuizDetail } = useQuizzes()

  useEffect(() => {
    void loadQuizDetail(id)
  }, [id, loadQuizDetail])

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    )
  }

  if (error || !selectedQuiz) {
    return (
      <section className="space-y-4">
        <Link
          href={`/${locale}/quizzes`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {t('detail.backToCatalog')}
        </Link>
        <p className="text-sm text-destructive">{t('errors.detailLoadFailed')}</p>
      </section>
    )
  }

  const timeLimitLabel = selectedQuiz.time_limit_sec
    ? t('labels.minutes', { n: Math.round(selectedQuiz.time_limit_sec / 60) })
    : t('labels.noLimit')

  const statusLabel =
    selectedQuiz.status === ContentStatus.Published
      ? t('labels.published')
      : selectedQuiz.status === ContentStatus.Draft
        ? t('labels.draft')
        : t('labels.archived')

  return (
    <section className="space-y-6">
      <Link
        href={`/${locale}/quizzes`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t('detail.backToCatalog')}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold md:text-4xl">{selectedQuiz.title}</h1>
          <Badge variant={STATUS_VARIANT[selectedQuiz.status]}>{statusLabel}</Badge>
        </div>
        {selectedQuiz.description ? (
          <p className="text-muted-foreground">{selectedQuiz.description}</p>
        ) : null}
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('labels.status')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('labels.totalQuestions')}</dt>
              <dd className="font-semibold text-lg">{selectedQuiz.total_questions}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.quizPoint')}</dt>
              <dd className="font-semibold text-lg">{selectedQuiz.quiz_point}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.timeLimit')}</dt>
              <dd className="font-semibold text-lg">{timeLimitLabel}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('bestScore')}</CardTitle>
        </CardHeader>
        <CardContent>
          {progress && progress.attempt_count > 0 ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('bestScore')}</dt>
                <dd className="font-semibold text-lg">{progress.best_score}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('attemptCount')}</dt>
                <dd className="font-semibold text-lg">{progress.attempt_count}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t('detail.noProgress')}</p>
          )}
        </CardContent>
      </Card>

      <div>
        <Button asChild>
          <Link href={`/${locale}/quizzes/${id}/session`}>{t('detail.startSession')}</Link>
        </Button>
      </div>
    </section>
  )
}
