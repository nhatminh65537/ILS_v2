import { AdminQuizTaxonomyPageClient } from '@/components/features/quizzes/admin/AdminQuizTaxonomyPageClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminQuizCategoriesPage({ params }: Props) {
  const { locale } = await params
  return <AdminQuizTaxonomyPageClient locale={locale} kind="category" />
}
