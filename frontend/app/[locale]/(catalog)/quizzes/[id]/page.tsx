import { QuizDetailClient } from '@/components/features/quizzes/QuizDetailClient'

type QuizDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function QuizDetailPage({ params }: QuizDetailPageProps) {
  const { locale, id } = await params
  return <QuizDetailClient id={Number(id)} locale={locale} />
}
