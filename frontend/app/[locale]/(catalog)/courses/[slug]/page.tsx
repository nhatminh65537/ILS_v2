import { CourseDetailClient } from '@/components/features/courses/CourseDetailClient'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params
  return <CourseDetailClient locale={locale} slug={slug} />
}
