import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContentStatus, type Quiz } from '@/types/quiz.types'

type QuizCardProps = {
  quiz: Quiz
  locale: string
}

export function QuizCard({ quiz, locale }: QuizCardProps) {
  const t = useTranslations('quizzes')

  if (quiz.status !== ContentStatus.Published) {
    return null
  }

  const timeLimitLabel = quiz.time_limit_sec
    ? t('labels.minutes', { n: Math.round(quiz.time_limit_sec / 60) })
    : t('labels.noLimit')

  return (
    <Link href={`/${locale}/quizzes/${quiz.id}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug line-clamp-2">{quiz.title}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {t('labels.published')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
          ) : null}
          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t('labels.totalQuestions')}</dt>
              <dd className="font-medium">{quiz.total_questions}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.quizPoint')}</dt>
              <dd className="font-medium">{quiz.quiz_point}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.timeLimit')}</dt>
              <dd className="font-medium">{timeLimitLabel}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  )
}
