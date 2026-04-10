import { QuizCatalogClient } from '@/components/features/quizzes/QuizCatalogClient'

type QuizzesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function QuizzesPage({ params }: QuizzesPageProps) {
  const { locale } = await params
  return <QuizCatalogClient locale={locale} />
}
