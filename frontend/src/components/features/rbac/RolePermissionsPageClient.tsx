'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { canManageRoles } from '@/lib/rbac-claim'
import { useRbac } from '@/hooks/useRbac'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionAssignmentPanel } from './PermissionAssignmentPanel'

type RolePermissionsPageClientProps = {
  locale: string
  roleId: number
}

export function RolePermissionsPageClient({ locale, roleId }: RolePermissionsPageClientProps) {
  const t = useTranslations('adminRbac')
  const tRoot = useTranslations()
  const accessToken = useAuthStore((state) => state.accessToken)

  const {
    activePermissions,
    isMutating,
    loadPermissions,
    loadRolePermissions,
    loadRoles,
    permissionsState,
    rolePermissions,
    rolesState,
    submitAssignPermission,
    submitRevokePermission,
  } = useRbac()

  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null)

  useEffect(() => {
    void loadRoles()
    void loadPermissions(true)
  }, [loadPermissions, loadRoles])

  useEffect(() => {
    void loadRolePermissions(roleId)
  }, [loadRolePermissions, roleId])

  const role = useMemo(
    () => rolesState.data.find((item) => item.id === roleId) ?? null,
    [rolesState.data, roleId]
  )

  const capability = useMemo(
    () => canManageRoles(accessToken, permissionsState.data),
    [accessToken, permissionsState.data]
  )

  const handleAssign = async (targetRoleId: number, permissionId: number) => {
    const result = await submitAssignPermission(targetRoleId, permissionId)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.assignPermissionFailed')
      return
    }

    setSubmitErrorKey(null)
  }

  const handleRevoke = async (targetRoleId: number, permissionId: number) => {
    const result = await submitRevokePermission(targetRoleId, permissionId)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.revokePermissionFailed')
      return
    }

    setSubmitErrorKey(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold md:text-3xl">{t('rolePermissionsTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('rolePermissionsSubtitle', { role: role?.name ?? `#${roleId}` })}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/${locale}/admin/rbac`}>{t('navigationBackToRbac')}</Link>
        </Button>
      </header>

      {permissionsState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(permissionsState.errorMessageKey)}</p>
      ) : null}
      {submitErrorKey ? <p className="text-xs text-destructive">{tRoot(submitErrorKey)}</p> : null}

      {!capability.canAssignRolePermission && !capability.canRevokeRolePermission ? (
        <p className="text-xs text-muted-foreground">{t('status.readOnlyHint')}</p>
      ) : null}

      <PermissionAssignmentPanel
        allPermissions={activePermissions}
        assignedPermissions={rolePermissions}
        canAssign={capability.canAssignRolePermission}
        canRevoke={capability.canRevokeRolePermission}
        isMutating={isMutating}
        onAssign={handleAssign}
        onRevoke={handleRevoke}
        roleId={roleId}
      />
    </main>
  )
}
