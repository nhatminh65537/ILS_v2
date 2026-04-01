'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { canManageRoles } from '@/lib/rbac-claim'
import { useRbac } from '@/hooks/useRbac'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleDto } from '@/types/rbac.types'
import { RbacActionToolbar } from './RbacActionToolbar'
import { RoleFormDialog } from './RoleFormDialog'
import { RoleListPanel } from './RoleListPanel'

type RbacOverviewClientProps = {
  locale: string
}

export function RbacOverviewClient({ locale }: RbacOverviewClientProps) {
  const t = useTranslations('adminRbac')
  const tRoot = useTranslations()
  const accessToken = useAuthStore((state) => state.accessToken)

  const {
    rolesState,
    permissionsState,
    isMutating,
    loadRoles,
    loadPermissions,
    submitCreateRole,
    submitDeleteRole,
    submitUpdateRole,
  } = useRbac()

  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null)
  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null)

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  useEffect(() => {
    void loadPermissions(includeInactive)
  }, [includeInactive, loadPermissions])

  const capability = useMemo(
    () => canManageRoles(accessToken, permissionsState.data),
    [accessToken, permissionsState.data]
  )

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return rolesState.data
    }

    return rolesState.data.filter((role) => {
      const name = role.name.toLowerCase()
      const description = role.description.toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [rolesState.data, search])

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return permissionsState.data
    }

    return permissionsState.data.filter((permission) => {
      const name = permission.name.toLowerCase()
      const description = permission.description.toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [permissionsState.data, search])

  const handleCreateRole = async (payload: { name: string; description?: string }) => {
    const result = await submitCreateRole(payload)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.createRoleFailed')
      return
    }

    setSubmitErrorKey(null)
    setCreateDialogOpen(false)
  }

  const handleUpdateRole = async (payload: { name: string; description?: string }) => {
    if (!editingRole) {
      return
    }

    const result = await submitUpdateRole(editingRole.id, payload)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.updateRoleFailed')
      return
    }

    setSubmitErrorKey(null)
    setEditingRole(null)
  }

  const handleDeleteRole = async (role: RoleDto) => {
    const confirmed = window.confirm(t('confirmation.deleteRole', { role: role.name }))
    if (!confirmed) {
      return
    }

    const result = await submitDeleteRole(role.id)
    if (!result.success) {
      setSubmitErrorKey(result.messageKey ?? 'adminRbac.errors.deleteRoleFailed')
      return
    }

    setSubmitErrorKey(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <p className="text-xs text-muted-foreground">
          {t('navigationHint')}{' '}
          <Link className="underline" href={`/${locale}/dashboard`}>
            {t('navigationBackToDashboard')}
          </Link>
        </p>
      </header>

      <RbacActionToolbar
        includeInactive={includeInactive}
        isRefreshing={rolesState.isLoading || permissionsState.isLoading}
        onRefresh={() => {
          void loadRoles()
          void loadPermissions(includeInactive)
        }}
        onSearchChange={setSearch}
        onToggleIncludeInactive={setIncludeInactive}
        search={search}
      />

      {rolesState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(rolesState.errorMessageKey)}</p>
      ) : null}
      {permissionsState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(permissionsState.errorMessageKey)}</p>
      ) : null}
      {submitErrorKey ? <p className="text-xs text-destructive">{tRoot(submitErrorKey)}</p> : null}

      {!capability.canListRoles ? (
        <p className="text-xs text-muted-foreground">{t('status.readOnlyHint')}</p>
      ) : null}

      <RoleListPanel
        canCreate={capability.canCreateRole}
        canDelete={capability.canDeleteRole}
        canManagePermissions={capability.canAssignRolePermission || capability.canRevokeRolePermission}
        canUpdate={capability.canUpdateRole}
        isLoading={rolesState.isLoading}
        isMutating={isMutating}
        locale={locale}
        onCreate={() => {
          setSubmitErrorKey(null)
          setCreateDialogOpen(true)
        }}
        onDelete={handleDeleteRole}
        onEdit={(role) => {
          setSubmitErrorKey(null)
          setEditingRole(role)
        }}
        roles={filteredRoles}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.permissions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('labels.permission')}</TableHead>
                <TableHead>{t('labels.description')}</TableHead>
                <TableHead>{t('labels.active')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionsState.isLoading ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('status.loadingPermissions')}
                  </TableCell>
                </TableRow>
              ) : null}

              {!permissionsState.isLoading && filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('empty.permissions')}
                  </TableCell>
                </TableRow>
              ) : null}

              {!permissionsState.isLoading
                ? filteredPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>{permission.name}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{permission.description}</TableCell>
                      <TableCell>{permission.is_active ? t('labels.activeYes') : t('labels.activeNo')}</TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        errorMessageKey={submitErrorKey}
        isSubmitting={isMutating}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) {
            setSubmitErrorKey(null)
          }
        }}
        onSubmit={handleCreateRole}
        open={createDialogOpen}
        role={null}
      />

      <RoleFormDialog
        errorMessageKey={submitErrorKey}
        isSubmitting={isMutating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null)
            setSubmitErrorKey(null)
          }
        }}
        onSubmit={handleUpdateRole}
        open={Boolean(editingRole)}
        role={editingRole}
      />
    </main>
  )
}
