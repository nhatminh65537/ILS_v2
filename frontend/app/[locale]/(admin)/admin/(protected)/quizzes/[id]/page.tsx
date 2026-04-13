import { AdminQuizEditorPageClient } from '@/components/features/quizzes/AdminQuizEditorPageClient'

type AdminQuizEditorPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminQuizEditorPage({ params }: AdminQuizEditorPageProps) {
  const { locale, id } = await params
  return <AdminQuizEditorPageClient locale={locale} quizId={Number(id)} />
}
