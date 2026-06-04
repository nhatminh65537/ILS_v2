import { AdminQuizExplorerClient } from '@/components/features/quizzes/admin/AdminQuizExplorerClient'

type AdminQuizzesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminQuizzesPage({ params }: AdminQuizzesPageProps) {
  const { locale } = await params
  return <AdminQuizExplorerClient locale={locale} />
}
