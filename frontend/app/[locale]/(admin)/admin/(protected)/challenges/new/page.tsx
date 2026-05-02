import { AdminChallengeCreatePageClient } from '@/components/features/challenges/admin/AdminChallengeCreatePageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminChallengeCreatePage({ params }: Props) {
  const { locale } = await params
  return <AdminChallengeCreatePageClient locale={locale} />
}
