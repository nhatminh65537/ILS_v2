import { notFound } from 'next/navigation'
import { RolePermissionsPageClient } from '@/components/features/rbac/RolePermissionsPageClient'

type RolePermissionPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function RolePermissionPage({ params }: RolePermissionPageProps) {
  const { locale, id } = await params
  const roleId = Number(id)

  if (!Number.isInteger(roleId) || roleId <= 0) {
    notFound()
  }

  return <RolePermissionsPageClient locale={locale} roleId={roleId} />
}
