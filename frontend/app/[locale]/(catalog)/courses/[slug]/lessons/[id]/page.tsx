import { LessonViewerClient } from '@/components/features/courses/LessonViewerClient'

type Props = {
  params: Promise<{ locale: string; slug: string; id: string }>
}

export default async function LessonViewerPage({ params }: Props) {
  const { locale, slug, id } = await params
  const lessonId = Number(id)

  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Invalid lesson</h1>
        <p className="text-muted-foreground">Lesson id must be a positive number.</p>
      </div>
    )
  }

  return <LessonViewerClient key={`${slug}-${lessonId}`} locale={locale} slug={slug} lessonId={lessonId} />
}
