import { AdminStatsPageClient } from '@/components/features/admin-stats/AdminStatsPageClient'

type AdminStatisticsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminStatisticsPage({ params }: AdminStatisticsPageProps) {
  const { locale } = await params
  return <AdminStatsPageClient locale={locale} />
}
