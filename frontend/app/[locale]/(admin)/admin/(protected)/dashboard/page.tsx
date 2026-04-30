import { AdminDashboardPageClient } from '@/components/features/admin-dashboard/AdminDashboardPageClient'

type AdminDashboardPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } = await params
  return <AdminDashboardPageClient locale={locale} />
}
