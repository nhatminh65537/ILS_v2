import { AdminChallengeInstancesPageClient } from '@/components/features/challenges/admin/AdminChallengeInstancesPageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminChallengeInstancesPage({ params }: Props) {
  const { locale } = await params
  return <AdminChallengeInstancesPageClient locale={locale} />
}
