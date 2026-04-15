import { CourseCatalogClient } from '@/components/features/courses/CourseCatalogClient'

type CoursesPageProps = {
  params: Promise<{ locale: string }>
}

export default async function CourseCatalogPage({ params }: CoursesPageProps) {
  const { locale } = await params
  return <CourseCatalogClient locale={locale} />
}
