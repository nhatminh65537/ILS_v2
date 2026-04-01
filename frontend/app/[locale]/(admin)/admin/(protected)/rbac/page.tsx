import { RbacOverviewClient } from '@/components/features/rbac/RbacOverviewClient'

type RbacPageProps = {
  params: Promise<{ locale: string }>
}

export default async function RbacPage({ params }: RbacPageProps) {
  const { locale } = await params
  return <RbacOverviewClient locale={locale} />
}
