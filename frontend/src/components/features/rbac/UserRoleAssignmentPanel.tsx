'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
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
import type { RoleDto, UserRoleMappingDto } from '@/types/rbac.types'

type UserRoleAssignmentPanelProps = {
  allRoles: readonly RoleDto[]
  assignedUserRoles: readonly UserRoleMappingDto[]
  userId: number
  canAssign: boolean
  canRevoke: boolean
  isMutating: boolean
  onAssignRole: (userId: number, roleId: number) => Promise<void>
  onRevokeRole: (userId: number, roleId: number) => Promise<void>
}

export function UserRoleAssignmentPanel({
  allRoles,
  assignedUserRoles,
  userId,
  canAssign,
  canRevoke,
  isMutating,
  onAssignRole,
  onRevokeRole,
}: UserRoleAssignmentPanelProps) {
  const t = useTranslations('adminRbac')

  const assignedRoleIds = useMemo(
    () => new Set(assignedUserRoles.map((mapping) => mapping.role)),
    [assignedUserRoles]
  )

  const availableRoles = useMemo(
    () => allRoles.filter((role) => !assignedRoleIds.has(role.id)),
    [allRoles, assignedRoleIds]
  )

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(availableRoles[0]?.id ?? null)

  const handleAssign = async () => {
    if (selectedRoleId === null) {
      return
    }

    await onAssignRole(userId, selectedRoleId)
    setSelectedRoleId(null)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.assignedRoles')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('labels.role')}</TableHead>
                <TableHead>{t('labels.roleId')}</TableHead>
                <TableHead>{t('labels.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedUserRoles.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={3}>
                    {t('empty.assignedRoles')}
                  </TableCell>
                </TableRow>
              ) : null}

              {assignedUserRoles.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Badge variant="outline">{mapping.role_name}</Badge>
                  </TableCell>
                  <TableCell>{mapping.role}</TableCell>
                  <TableCell>
                    {canRevoke ? (
                      <Button
                        disabled={isMutating}
                        onClick={() => onRevokeRole(userId, mapping.role)}
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
          <CardTitle>{t('sections.availableRoles')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canAssign ? (
            <div className="space-y-2">
              <Label htmlFor="assign-role-select">{t('labels.role')}</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedRoleId !== null ? String(selectedRoleId) : ''}
                  onValueChange={(v) => setSelectedRoleId(v ? Number(v) : null)}
                >
                  <SelectTrigger id="assign-role-select" className="h-8 text-xs">
                    <SelectValue placeholder={t('labels.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={isMutating || selectedRoleId === null}
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
                <TableHead>{t('labels.role')}</TableHead>
                <TableHead>{t('labels.type')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableRoles.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={2}>
                    {t('empty.availableRoles')}
                  </TableCell>
                </TableRow>
              ) : null}

              {availableRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.is_system ? t('labels.systemRole') : t('labels.customRole')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
