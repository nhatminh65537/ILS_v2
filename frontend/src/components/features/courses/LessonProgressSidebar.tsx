import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { UserCourseProgress } from '@/types/course.types'
import type { LessonCompletionSignal } from '@/types/lesson.types'

type NeighborLessonLink = {
  readonly lessonId: number
  readonly title: string
}

type LessonProgressSidebarProps = {
  locale: string
  slug: string
  isStarted: boolean
  isCompleted: boolean
  isSubmitting: boolean
  signal: LessonCompletionSignal
  courseProgress: UserCourseProgress | null
  previousLesson: NeighborLessonLink | null
  nextLesson: NeighborLessonLink | null
  onStart: () => void
  onComplete: () => void
}

const toPercent = (value: number | string): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function LessonProgressSidebar({
  locale,
  slug,
  isStarted,
  isCompleted,
  isSubmitting,
  signal,
  courseProgress,
  previousLesson,
  nextLesson,
  onStart,
  onComplete,
}: LessonProgressSidebarProps) {
  const t = useTranslations('courses.lessonViewer')

  const coursePercent = courseProgress ? toPercent(courseProgress.percent) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('progressTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {courseProgress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('courseProgress')}</span>
                <span className="font-medium">{coursePercent.toFixed(2)}%</span>
              </div>
              <Progress value={coursePercent} />
              <p className="text-xs text-muted-foreground">
                {t('completedLessons', {
                  completed: courseProgress.completed,
                  total: courseProgress.lesson_count,
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noCourseProgress')}</p>
          )}

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('guidedProgress')}</span>
              <span className="font-medium">{signal.progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={signal.progressPercent} />
            <p className="text-xs text-muted-foreground">{t(signal.hintKey)}</p>
          </div>

          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full" disabled={isStarted || isSubmitting} onClick={onStart}>
              {isStarted ? t('started') : t('startButton')}
            </Button>
            <Button type="button" className="w-full" disabled={isCompleted || isSubmitting} onClick={onComplete}>
              {isCompleted ? t('completed') : t('completeButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('navigationTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {previousLesson ? (
            <Link href={`/${locale}/courses/${slug}/lessons/${previousLesson.lessonId}`} className="block underline">
              {t('previousLesson')}: {previousLesson.title}
            </Link>
          ) : (
            <p className="text-muted-foreground">{t('noPreviousLesson')}</p>
          )}

          {nextLesson ? (
            <Link href={`/${locale}/courses/${slug}/lessons/${nextLesson.lessonId}`} className="block underline">
              {t('nextLesson')}: {nextLesson.title}
            </Link>
          ) : (
            <p className="text-muted-foreground">{t('noNextLesson')}</p>
          )}

          <Link href={`/${locale}/courses/${slug}`} className="block pt-2 text-muted-foreground underline">
            {t('backToCourse')}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
