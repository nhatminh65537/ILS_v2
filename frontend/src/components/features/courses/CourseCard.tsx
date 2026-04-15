import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContentStatus, type Course } from '@/types/course.types'

type CourseCardProps = {
  course: Course
  locale: string
}

const STATUS_VARIANT: Record<ContentStatus, 'default' | 'secondary' | 'outline'> = {
  [ContentStatus.Published]: 'default',
  [ContentStatus.Draft]: 'secondary',
  [ContentStatus.Archived]: 'outline',
}

export function CourseCard({ course, locale }: CourseCardProps) {
  const t = useTranslations('courses')

  const statusLabel =
    course.status === ContentStatus.Published
      ? t('labels.statusPublished')
      : course.status === ContentStatus.Draft
        ? t('labels.statusDraft')
        : t('labels.statusArchived')

  return (
    <Link href={`/${locale}/courses/${course.slug}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base leading-snug">{course.title}</CardTitle>
            <Badge variant={STATUS_VARIANT[course.status]} className="shrink-0 text-xs">
              {statusLabel}
            </Badge>
          </div>
          {course.category ? (
            <p className="text-xs text-muted-foreground">{t('labels.category')}: {course.category.name}</p>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3">
          {course.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
          ) : null}

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t('labels.learningPoint')}</dt>
              <dd className="font-medium">{course.learning_point}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.estimatedTime')}</dt>
              <dd className="font-medium">{course.estimated_time}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('labels.progress')}</dt>
              <dd className="font-medium">
                {course.user_progress ? `${course.user_progress.completed}/${course.user_progress.total}` : t('labels.noProgress')}
              </dd>
            </div>
          </dl>

          {course.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {course.tags.slice(0, 4).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}
