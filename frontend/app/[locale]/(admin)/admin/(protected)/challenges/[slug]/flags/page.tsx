import { AdminChallengeFlagsPageClient } from '@/components/features/challenges/admin/AdminChallengeFlagsPageClient'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function AdminChallengeFlagsPage({ params }: Props) {
  const { locale, slug } = await params
  return <AdminChallengeFlagsPageClient locale={locale} slug={slug} />
}
