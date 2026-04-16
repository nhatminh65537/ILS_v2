import { AdminLearnCourseCreatePageClient } from '@/components/features/courses/admin/AdminLearnCourseCreatePageClient'

type AdminLearnCourseCreatePageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminLearnCourseCreatePage({ params }: AdminLearnCourseCreatePageProps) {
  const { locale } = await params
  return <AdminLearnCourseCreatePageClient locale={locale} />
}
