import { notFound } from 'next/navigation'
import { UserRolesPageClient } from '@/components/features/rbac/UserRolesPageClient'

type UserRolesPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function UserRolesPage({ params }: UserRolesPageProps) {
  const { locale, id } = await params
  const userId = Number(id)

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound()
  }

  return <UserRolesPageClient locale={locale} userId={userId} />
}
