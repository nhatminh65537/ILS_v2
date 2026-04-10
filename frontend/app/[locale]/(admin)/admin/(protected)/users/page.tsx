import { AdminUsersPageClient } from '@/components/features/admin-users/AdminUsersPageClient'

type AdminUsersPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminUsersPage({ params }: AdminUsersPageProps) {
  const { locale } = await params
  return <AdminUsersPageClient locale={locale} />
}
