import { AdminChallengeTaxonomyPageClient } from '@/components/features/challenges/admin/AdminChallengeTaxonomyPageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminChallengeCategoriesPage({ params }: Props) {
  const { locale } = await params
  return <AdminChallengeTaxonomyPageClient locale={locale} kind="category" />
}
