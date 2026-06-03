import { AdminChallengeExplorerClient } from '@/components/features/challenges/admin/AdminChallengeExplorerClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminChallengeExplorerPage({ params }: Props) {
  const { locale } = await params
  return <AdminChallengeExplorerClient locale={locale} />
}
