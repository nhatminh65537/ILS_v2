import { AdminLearnTaxonomyPageClient } from '@/components/features/courses/admin/AdminLearnTaxonomyPageClient'

type AdminLearnCategoriesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminLearnCategoriesPage({ params }: AdminLearnCategoriesPageProps) {
  const { locale } = await params
  return <AdminLearnTaxonomyPageClient locale={locale} kind="category" />
}
