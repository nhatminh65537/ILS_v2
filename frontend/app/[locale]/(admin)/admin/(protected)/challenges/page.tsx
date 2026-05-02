import { AdminChallengeListPageClient } from '@/components/features/challenges/admin/AdminChallengeListPageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminChallengeListPage({ params }: Props) {
  const { locale } = await params
  return <AdminChallengeListPageClient locale={locale} />
}
