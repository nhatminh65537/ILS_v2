'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PermissionDto } from '@/types/rbac.types'

type PermissionAssignmentPanelProps = {
  roleId: number
  allPermissions: readonly PermissionDto[]
  assignedPermissions: readonly PermissionDto[]
  isMutating: boolean
  canAssign: boolean
  canRevoke: boolean
  onAssign: (roleId: number, permissionId: number) => Promise<void>
  onRevoke: (roleId: number, permissionId: number) => Promise<void>
}

export function PermissionAssignmentPanel({
  roleId,
  allPermissions,
  assignedPermissions,
  isMutating,
  canAssign,
  canRevoke,
  onAssign,
  onRevoke,
}: PermissionAssignmentPanelProps) {
  const t = useTranslations('adminRbac')

  const assignedIds = useMemo(
    () => new Set(assignedPermissions.map((permission) => permission.id)),
    [assignedPermissions]
  )

  const availablePermissions = useMemo(
    () => allPermissions.filter((permission) => permission.is_active && !assignedIds.has(permission.id)),
    [allPermissions, assignedIds]
  )

  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(
    availablePermissions[0]?.id ?? null
  )

  const handleAssign = async () => {
    if (selectedPermissionId === null) {
      return
    }

    await onAssign(roleId, selectedPermissionId)
    setSelectedPermissionId(null)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.assignedPermissions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('labels.permission')}</TableHead>
                <TableHead>{t('labels.description')}</TableHead>
                <TableHead>{t('labels.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedPermissions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('empty.assignedPermissions')}
                  </TableCell>
                </TableRow>
              ) : null}
              {assignedPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>{permission.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{permission.description}</TableCell>
                  <TableCell>
                    {canRevoke ? (
                      <Button
                        disabled={isMutating}
                        onClick={() => onRevoke(roleId, permission.id)}
                        size="xs"
                        type="button"
                        variant="destructive"
                      >
                        {t('actions.revoke')}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('status.readOnly')}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.availablePermissions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canAssign ? (
            <div className="space-y-2">
              <Label htmlFor="assign-permission-select">{t('labels.permission')}</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedPermissionId !== null ? String(selectedPermissionId) : ''}
                  onValueChange={(v) => setSelectedPermissionId(v ? Number(v) : null)}
                >
                  <SelectTrigger id="assign-permission-select" className="h-8 text-xs">
                    <SelectValue placeholder={t('labels.selectPermission')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePermissions.map((permission) => (
                      <SelectItem key={permission.id} value={String(permission.id)}>
                        {permission.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={isMutating || selectedPermissionId === null}
                  onClick={handleAssign}
                  size="sm"
                  type="button"
                >
                  {t('actions.assign')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('status.readOnly')}</p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('labels.permission')}</TableHead>
                <TableHead>{t('labels.description')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availablePermissions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={2}>
                    {t('empty.availablePermissions')}
                  </TableCell>
                </TableRow>
              ) : null}
              {availablePermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>{permission.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{permission.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
