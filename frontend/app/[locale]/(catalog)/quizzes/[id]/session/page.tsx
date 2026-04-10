import { QuizSessionClient } from '@/components/features/quizzes/QuizSessionClient'

type QuizSessionPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function QuizSessionPage({ params }: QuizSessionPageProps) {
  const { locale, id } = await params
  return (
    <div className="mx-auto max-w-2xl py-8">
      <QuizSessionClient quizId={Number(id)} locale={locale} />
    </div>
  )
}
