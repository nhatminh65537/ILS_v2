import { AdminLearnCourseEditorPageClient } from '@/components/features/courses/admin/AdminLearnCourseEditorPageClient'

type AdminLearnCourseEditorPageProps = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function AdminLearnCourseEditorPage({ params }: AdminLearnCourseEditorPageProps) {
  const { locale, slug } = await params
  return <AdminLearnCourseEditorPageClient locale={locale} slug={slug} />
}
