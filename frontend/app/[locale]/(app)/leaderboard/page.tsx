import { getTranslations } from 'next-intl/server'
import { LeaderboardPageClient } from '@/components/features/leaderboard/LeaderboardPageClient'

type LeaderboardPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { locale } = await params
  await getTranslations('leaderboard')

  return <LeaderboardPageClient locale={locale} />
}
