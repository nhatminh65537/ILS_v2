'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useQuizSession } from '@/hooks/useQuizSession'
import { QuizAnswerResultCard } from './QuizAnswerResultCard'
import { QuizFinishScreen } from './QuizFinishScreen'
import { QuizQuestionView } from './QuizQuestionView'

type Props = {
  quizId: number
  locale: string
}

export function QuizSessionClient({ quizId, locale }: Props) {
  const t = useTranslations('quizzes')
  const {
    status,
    questionPhase,
    currentQuestion,
    progress,
    answerResult,
    finishData,
    elapsedSec,
    error,
    sendAnswer,
    sendNext,
  } = useQuizSession(quizId)

  // ── Connecting / authenticating ──────────────────────────────────────────
  if (status === 'idle' || status === 'connecting' || status === 'authenticating') {
    const label = status === 'authenticating' ? t('session.authenticating') : t('session.connecting')
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    const errorKey = error === 'connectionFailed'
      ? 'errors.connectionFailed'
      : error === 'authFailed'
        ? 'errors.authFailed'
        : 'errors.sessionError'

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{t(errorKey)}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href={`/${locale}/quizzes/${quizId}`}>{t('detail.backToCatalog')}</Link>
        </Button>
      </div>
    )
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (status === 'finished' && finishData) {
    return <QuizFinishScreen data={finishData} quizId={quizId} locale={locale} />
  }

  // ── Active session ───────────────────────────────────────────────────────
  const progressPercent = progress
    ? Math.round(((progress.current - 1) / progress.total) * 100)
    : 0

  const elapsedLabel = (() => {
    const m = Math.floor(elapsedSec / 60)
    const s = elapsedSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })()

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {progress
                ? t('session.question', { current: progress.current, total: progress.total })
                : null}
            </CardTitle>
            <span className="text-sm tabular-nums text-muted-foreground">{elapsedLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Question or result */}
      {currentQuestion ? (
        questionPhase === 'questioning' ? (
          <QuizQuestionView
            key={currentQuestion.id}
            question={currentQuestion}
            onSubmit={sendAnswer}
            disabled={false}
          />
        ) : answerResult ? (
          <QuizAnswerResultCard result={answerResult} onNext={sendNext} />
        ) : null
      ) : (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('session.connecting')}</p>
        </div>
      )}
    </div>
  )
}
