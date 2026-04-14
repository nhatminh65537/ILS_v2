import { QuizSessionClient } from '@/components/features/quizzes/QuizSessionClient'

type QuizSessionPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams?: Promise<{ restart?: string }>
}

export default async function QuizSessionPage({ params, searchParams }: QuizSessionPageProps) {
  const { locale, id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const restartKey = resolvedSearchParams.restart ?? 'default'

  return (
    <div className="mx-auto max-w-2xl py-8">
      <QuizSessionClient key={`${id}-${restartKey}`} quizId={Number(id)} locale={locale} />
    </div>
  )
}
