'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TruncatedCell } from '@/components/ui/truncated-cell'
import { useRbac } from '@/hooks/useRbac'
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

  const {
    rolesState,
    permissionsState,
    permissionsPageState,
    permissionsPagination,
    isMutating,
    loadRoles,
    loadPermissions,
    loadPermissionsPage,
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
    void loadPermissionsPage(includeInactive, 1)
  }, [includeInactive, loadPermissions, loadPermissionsPage])

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
      return permissionsPageState.data
    }

    return permissionsPageState.data.filter((permission) => {
      const name = permission.name.toLowerCase()
      const description = permission.description.toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [permissionsPageState.data, search])

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
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <p className="text-xs text-muted-foreground">
          {t('navigationHint')}{' '}
          <Link className="underline" href={`/${locale}/admin`}>
            {t('navigationBackToAdmin')}
          </Link>
        </p>
      </header>

      <RbacActionToolbar
        includeInactive={includeInactive}
        isRefreshing={rolesState.isLoading || permissionsPageState.isLoading}
        onRefresh={() => {
          void loadRoles()
          void loadPermissions(includeInactive)
          void loadPermissionsPage(includeInactive, permissionsPagination.page)
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
      {permissionsPageState.errorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(permissionsPageState.errorMessageKey)}</p>
      ) : null}
      {submitErrorKey ? <p className="text-xs text-destructive">{tRoot(submitErrorKey)}</p> : null}

      <RoleListPanel
        canCreate={true}
        canDelete={true}
        canManagePermissions={true}
        canUpdate={true}
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
              {permissionsPageState.isLoading ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('status.loadingPermissions')}
                  </TableCell>
                </TableRow>
              ) : null}

              {!permissionsPageState.isLoading && filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('empty.permissions')}
                  </TableCell>
                </TableRow>
              ) : null}

              {!permissionsPageState.isLoading
                ? filteredPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>{permission.name}</TableCell>
                      <TableCell>
                        <TruncatedCell
                          value={permission.description}
                          className="max-w-105"
                          dialogTitle={permission.name}
                        />
                      </TableCell>
                      <TableCell>{permission.is_active ? t('labels.activeYes') : t('labels.activeNo')}</TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {t('pagination.pageInfo', { page: permissionsPagination.page })}
              {' · '}
              {t('pagination.totalInfo', { total: permissionsPagination.count })}
            </p>

            <div className="flex items-center gap-2">
              <Button
                disabled={!permissionsPagination.hasPrevious || permissionsPageState.isLoading}
                onClick={() => {
                  void loadPermissionsPage(includeInactive, Math.max(1, permissionsPagination.page - 1))
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {t('pagination.previous')}
              </Button>
              <Button
                disabled={!permissionsPagination.hasNext || permissionsPageState.isLoading}
                onClick={() => {
                  void loadPermissionsPage(includeInactive, permissionsPagination.page + 1)
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
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
    </section>
  )
}
