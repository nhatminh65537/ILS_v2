'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { canManageUserRoles } from '@/lib/rbac-claim'
import { useRbac } from '@/hooks/useRbac'
import { useAuthStore } from '@/stores/auth.store'
import { UserRoleAssignmentPanel } from './UserRoleAssignmentPanel'

type UserRolesPageClientProps = {
  locale: string
  userId: number
}

export function UserRolesPageClient({ locale, userId }: UserRolesPageClientProps) {
  const t = useTranslations('adminRbac')
  const tRoot = useTranslations()
  const accessToken = useAuthStore((state) => state.accessToken)

  const {
    isMutating,
    loadPermissions,
    loadRoles,
    loadUserRoles,
    permissionsState,
    rolesState,
    submitAssignUserRole,
    submitRevokeUserRole,
    userRolesState,
  } = useRbac()

  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null)

  useEffect(() => {
    void loadPermissions(true)
    void loadRoles()
  }, [loadPermissions, loadRoles])

  useEffect(() => {
    void loadUserRoles(userId)
  }, [loadUserRoles, userId])

  const capability = useMemo(
    () => canManageUserRoles(accessToken, permissionsState.data),
    [accessToken, permissionsState.data]
  )

  const handleAssignRole = async (targetUserId: number, roleId: number) => {
    const result = await submitAssignUserRole(targetUserId, roleId)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.assignUserRoleFailed')
      return
    }

    setSubmitErrorKey(null)
  }

  const handleRevokeRole = async (targetUserId: number, roleId: number) => {
    const result = await submitRevokeUserRole(targetUserId, roleId)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.revokeUserRoleFailed')
      return
    }

    setSubmitErrorKey(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold md:text-3xl">{t('userRolesTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('userRolesSubtitle', { userId })}</p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/admin/rbac`}>{t('navigationBackToRbac')}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/admin/users`}>{t('navigationBackToUsers')}</Link>
          </Button>
        </div>
      </header>

      {rolesState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(rolesState.errorMessageKey)}</p>
      ) : null}
      {userRolesState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(userRolesState.errorMessageKey)}</p>
      ) : null}
      {submitErrorKey ? <p className="text-xs text-destructive">{tRoot(submitErrorKey)}</p> : null}

      {(rolesState.isLoading || userRolesState.isLoading) ? (
        <p className="text-xs text-muted-foreground">{t('status.loadingUserRoles')}</p>
      ) : null}

      {!capability.canAssignUserRole && !capability.canRevokeUserRole ? (
        <p className="text-xs text-muted-foreground">{t('status.readOnlyHint')}</p>
      ) : null}

      <UserRoleAssignmentPanel
        allRoles={rolesState.data}
        assignedUserRoles={userRolesState.data}
        canAssign={capability.canAssignUserRole}
        canRevoke={capability.canRevokeUserRole}
        isMutating={isMutating}
        onAssignRole={handleAssignRole}
        onRevokeRole={handleRevokeRole}
        userId={userId}
      />
    </main>
  )
}
