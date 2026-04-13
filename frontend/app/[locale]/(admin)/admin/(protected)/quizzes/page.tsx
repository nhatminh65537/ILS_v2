import { AdminQuizListPageClient } from '@/components/features/quizzes/AdminQuizListPageClient'

type AdminQuizzesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminQuizzesPage({ params }: AdminQuizzesPageProps) {
  const { locale } = await params
  return <AdminQuizListPageClient locale={locale} />
}
