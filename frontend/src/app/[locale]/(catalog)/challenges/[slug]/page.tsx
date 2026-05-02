import { ChallengeDetailClient } from '@/components/features/challenges/ChallengeDetailClient'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { locale, slug } = await params
  return <ChallengeDetailClient locale={locale} slug={slug} />
}
