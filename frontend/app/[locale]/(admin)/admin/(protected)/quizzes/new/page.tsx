import { AdminQuizCreatePageClient } from '@/components/features/quizzes/AdminQuizCreatePageClient'

type AdminQuizCreatePageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminQuizCreatePage({ params }: AdminQuizCreatePageProps) {
  const { locale } = await params
  return <AdminQuizCreatePageClient locale={locale} />
}
