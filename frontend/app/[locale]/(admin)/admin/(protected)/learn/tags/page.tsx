import { AdminLearnTaxonomyPageClient } from '@/components/features/courses/admin/AdminLearnTaxonomyPageClient'

type AdminLearnTagsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminLearnTagsPage({ params }: AdminLearnTagsPageProps) {
  const { locale } = await params
  return <AdminLearnTaxonomyPageClient locale={locale} kind="tag" />
}
