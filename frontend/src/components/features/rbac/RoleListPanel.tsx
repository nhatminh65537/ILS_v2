'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
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
import type { RoleDto } from '@/types/rbac.types'

type RoleListPanelProps = {
  locale: string
  roles: readonly RoleDto[]
  isLoading: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManagePermissions: boolean
  isMutating: boolean
  onCreate: () => void
  onEdit: (role: RoleDto) => void
  onDelete: (role: RoleDto) => void
}

export function RoleListPanel({
  locale,
  roles,
  isLoading,
  canCreate,
  canUpdate,
  canDelete,
  canManagePermissions,
  isMutating,
  onCreate,
  onEdit,
  onDelete,
}: RoleListPanelProps) {
  const t = useTranslations('adminRbac')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t('sections.roles')}</CardTitle>
        {canCreate ? (
          <Button disabled={isMutating} onClick={onCreate} size="sm" type="button">
            {t('actions.createRole')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('labels.name')}</TableHead>
              <TableHead>{t('labels.description')}</TableHead>
              <TableHead>{t('labels.type')}</TableHead>
              <TableHead>{t('labels.permissionCount')}</TableHead>
              <TableHead>{t('labels.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  {t('status.loadingRoles')}
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && roles.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  {t('empty.roles')}
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading
              ? roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>{role.name}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.is_system ? 'secondary' : 'outline'}>
                        {role.is_system ? t('labels.systemRole') : t('labels.customRole')}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.permissions.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {canManagePermissions ? (
                          <Button asChild size="xs" variant="outline">
                            <Link href={`/${locale}/admin/rbac/roles/${role.id}`}>
                              {t('actions.managePermissions')}
                            </Link>
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <Button
                            disabled={isMutating}
                            onClick={() => onEdit(role)}
                            size="xs"
                            type="button"
                            variant="ghost"
                          >
                            {t('actions.editRole')}
                          </Button>
                        ) : null}
                        {canDelete && !role.is_system ? (
                          <Button
                            disabled={isMutating}
                            onClick={() => onDelete(role)}
                            size="xs"
                            type="button"
                            variant="destructive"
                          >
                            {t('actions.deleteRole')}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
