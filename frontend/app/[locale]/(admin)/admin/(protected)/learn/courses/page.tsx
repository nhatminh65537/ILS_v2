import { AdminLearnCourseListPageClient } from '@/components/features/courses/admin/AdminLearnCourseListPageClient'

type AdminLearnCoursesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminLearnCoursesPage({ params }: AdminLearnCoursesPageProps) {
  const { locale } = await params
  return <AdminLearnCourseListPageClient locale={locale} />
}
