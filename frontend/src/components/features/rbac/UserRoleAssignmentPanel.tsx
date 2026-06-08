'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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

/**
 * Single-panel, multi-select role editor for a user.
 *
 * Replaces the old two-card "pick one + Assign" flow with a searchable checkbox
 * list (checked = assigned). Toggle several, then "Save changes" diffs against
 * the original assignments and applies each add/remove via the single-item API.
 */
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

  const originalIds = useMemo(
    () => new Set(assignedUserRoles.map((mapping) => mapping.role)),
    [assignedUserRoles]
  )

  // Reset the working selection when the assignments change (adjusting state
  // during render — preferred over setState-in-effect), keyed off a signature.
  const assignmentSignature = useMemo(
    () => [...originalIds].sort((a, b) => a - b).join(','),
    [originalIds]
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(originalIds))
  const [syncedSignature, setSyncedSignature] = useState(assignmentSignature)
  if (syncedSignature !== assignmentSignature) {
    setSyncedSignature(assignmentSignature)
    setSelectedIds(new Set(originalIds))
  }

  const [search, setSearch] = useState('')

  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRoles
    return allRoles.filter((r) => r.name.toLowerCase().includes(q))
  }, [allRoles, search])

  const editable = canAssign || canRevoke

  const toggle = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toAdd = useMemo(
    () => (canAssign ? [...selectedIds].filter((id) => !originalIds.has(id)) : []),
    [selectedIds, originalIds, canAssign]
  )
  const toRemove = useMemo(
    () => (canRevoke ? [...originalIds].filter((id) => !selectedIds.has(id)) : []),
    [selectedIds, originalIds, canRevoke]
  )
  const dirtyCount = toAdd.length + toRemove.length

  const handleSave = async () => {
    for (const id of toRemove) await onRevokeRole(userId, id)
    for (const id of toAdd) await onAssignRole(userId, id)
  }

  const handleReset = () => setSelectedIds(new Set(originalIds))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sections.roles')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder={t('labels.selectRole')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-muted-foreground text-xs">
            {t('labels.selectedCount', { count: selectedIds.size })}
          </span>
        </div>

        {!editable ? (
          <p className="text-muted-foreground text-xs">{t('status.readOnly')}</p>
        ) : null}

        <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {visibleRoles.length === 0 ? (
            <p className="text-muted-foreground p-2 text-sm">{t('empty.roles')}</p>
          ) : (
            visibleRoles.map((role) => {
              const checked = selectedIds.has(role.id)
              return (
                <label
                  key={role.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggle(role.id, c === true)}
                    disabled={isMutating || !editable}
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline">{role.name}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {role.is_system ? t('labels.systemRole') : t('labels.customRole')}
                    </span>
                  </span>
                </label>
              )
            })
          )}
        </div>

        {editable ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isMutating || dirtyCount === 0}
            >
              {t('actions.reset')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isMutating || dirtyCount === 0}
            >
              {t('actions.saveChanges', { count: dirtyCount })}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
