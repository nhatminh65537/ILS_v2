import { AdminQuizQuestionsPageClient } from '@/components/features/quizzes/AdminQuizQuestionsPageClient'

type AdminQuizQuestionsPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminQuizQuestionsPage({ params }: AdminQuizQuestionsPageProps) {
  const { locale, id } = await params
  return <AdminQuizQuestionsPageClient locale={locale} quizId={Number(id)} />
}
