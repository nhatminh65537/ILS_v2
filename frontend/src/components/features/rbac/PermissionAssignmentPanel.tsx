'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const ALL_NAMESPACES = '__all__'

/** First dotted segment of a permission name, e.g. `api.role.list` -> `api`. */
function namespaceOf(name: string): string {
  const idx = name.indexOf('.')
  return idx === -1 ? name : name.slice(0, idx)
}

/**
 * Single-panel, multi-select permission editor for a role.
 *
 * Replaces the old two-card "pick one from a dropdown + Assign" flow. The full
 * permission catalog is shown as a searchable, namespace-filterable checkbox
 * list (checked = granted). Toggle as many as you like, then "Save changes"
 * diffs against the original grants and applies each add/remove via the existing
 * single-item assign/revoke API.
 */
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

  const activePermissions = useMemo(
    () => allPermissions.filter((p) => p.is_active),
    [allPermissions]
  )

  // Original grants (source of truth to diff against on save).
  const originalIds = useMemo(
    () => new Set(assignedPermissions.map((p) => p.id)),
    [assignedPermissions]
  )

  // Working selection. We reset it (adjusting state during render — the React-
  // recommended pattern over a setState-in-effect) whenever the underlying
  // grants change, tracked via a stable signature of the assigned ids.
  const grantSignature = useMemo(
    () => [...originalIds].sort((a, b) => a - b).join(','),
    [originalIds]
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(originalIds))
  const [syncedSignature, setSyncedSignature] = useState(grantSignature)
  if (syncedSignature !== grantSignature) {
    setSyncedSignature(grantSignature)
    setSelectedIds(new Set(originalIds))
  }

  const [search, setSearch] = useState('')
  const [namespace, setNamespace] = useState<string>(ALL_NAMESPACES)

  const namespaces = useMemo(() => {
    const set = new Set(activePermissions.map((p) => namespaceOf(p.name)))
    return Array.from(set).sort()
  }, [activePermissions])

  const visiblePermissions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activePermissions.filter((p) => {
      if (namespace !== ALL_NAMESPACES && namespaceOf(p.name) !== namespace) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [activePermissions, namespace, search])

  const editable = canAssign || canRevoke

  const toggle = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const p of visiblePermissions) {
        if (checked) next.add(p.id)
        else next.delete(p.id)
      }
      return next
    })
  }

  // Diff vs original, gated by what the caller is allowed to do.
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
    // Apply removals then additions; each uses the existing single-item API.
    for (const id of toRemove) await onRevoke(roleId, id)
    for (const id of toAdd) await onAssign(roleId, id)
  }

  const handleReset = () => setSelectedIds(new Set(originalIds))

  const allVisibleChecked =
    visiblePermissions.length > 0 && visiblePermissions.every((p) => selectedIds.has(p.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sections.permissions')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar: search + namespace filter */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder={t('labels.searchPermissions')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={namespace} onValueChange={setNamespace}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('labels.namespace')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_NAMESPACES}>{t('labels.allNamespaces')}</SelectItem>
              {namespaces.map((ns) => (
                <SelectItem key={ns} value={ns}>
                  {ns}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs">
            {t('labels.selectedCount', { count: selectedIds.size })}
          </span>
        </div>

        {!editable ? (
          <p className="text-muted-foreground text-xs">{t('status.readOnly')}</p>
        ) : null}

        {/* Select-all-visible row */}
        {editable && visiblePermissions.length > 0 ? (
          <label className="flex items-center gap-2 text-xs font-medium">
            <Checkbox
              checked={allVisibleChecked}
              onCheckedChange={(c) => toggleAllVisible(c === true)}
              disabled={isMutating}
            />
            {t('labels.selectAllVisible')}
          </label>
        ) : null}

        {/* Checkbox list */}
        <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {visiblePermissions.length === 0 ? (
            <p className="text-muted-foreground p-2 text-sm">{t('empty.permissions')}</p>
          ) : (
            visiblePermissions.map((permission) => {
              const checked = selectedIds.has(permission.id)
              return (
                <label
                  key={permission.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    onCheckedChange={(c) => toggle(permission.id, c === true)}
                    disabled={isMutating || !editable}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs">{permission.name}</span>
                    {permission.description ? (
                      <span className="text-muted-foreground block text-xs">
                        {permission.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              )
            })
          )}
        </div>

        {/* Save / reset */}
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
