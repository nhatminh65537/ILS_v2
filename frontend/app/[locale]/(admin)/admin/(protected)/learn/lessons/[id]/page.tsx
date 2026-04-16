import { getTranslations } from 'next-intl/server'
import { AdminLearnLessonEditorPageClient } from '@/components/features/courses/admin/AdminLearnLessonEditorPageClient'

type AdminLearnLessonEditorPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminLearnLessonEditorPage({ params }: AdminLearnLessonEditorPageProps) {
  const { locale, id } = await params
  const lessonId = Number(id)
  const t = await getTranslations('adminLearn')

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return <p className="text-sm text-muted-foreground">{t('errors.invalidLessonId')}</p>
  }

  return <AdminLearnLessonEditorPageClient locale={locale} lessonId={lessonId} />
}
