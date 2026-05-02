'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, FolderTree, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ChallengeNode } from '@/types/challenge.types'

type AdminChallengeNodeRowProps = {
  locale: string
  node: ChallengeNode
  depth: number
  expandedNodeIds: number[]
  childrenByParentId: Record<number, ChallengeNode[]>
  isNodeLoadingById: Record<number, boolean>
  isMutating: boolean
  onToggle: (node: ChallengeNode) => void
  onRename: (nodeId: number, title: string) => Promise<boolean>
  onMove: (nodeId: number, parentId: number | null) => Promise<boolean>
  onReorder: (nodeId: number, position: number) => Promise<boolean>
  onDelete: (nodeId: number) => Promise<boolean>
}

export function AdminChallengeNodeRow({
  locale,
  node,
  depth,
  expandedNodeIds,
  childrenByParentId,
  isNodeLoadingById,
  isMutating,
  onToggle,
  onRename,
  onMove,
  onReorder,
  onDelete,
}: AdminChallengeNodeRowProps) {
  const t = useTranslations('adminChallenges')
  const isExpanded = expandedNodeIds.includes(node.id)
  const children = childrenByParentId[node.id] ?? []

  const handleRename = async () => {
    const nextTitle = window.prompt(t('tree.renamePrompt'), node.title)
    if (!nextTitle || nextTitle.trim() === node.title) return
    await onRename(node.id, nextTitle.trim())
  }

  const handleMove = async () => {
    const value = window.prompt(
      t('tree.movePrompt'),
      node.parent_id != null ? String(node.parent_id) : ''
    )
    if (value == null) return
    const normalized = value.trim()
    const parentId = normalized ? Number(normalized) : null
    if (Number.isNaN(parentId)) return
    await onMove(node.id, parentId)
  }

  const handleDelete = async () => {
    if (!window.confirm(t('tree.deleteConfirm'))) return
    await onDelete(node.id)
  }

  return (
    <li className="space-y-2" style={{ marginLeft: depth * 14 }}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
        {!node.is_item ? (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onToggle(node)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <span className="inline-block h-7 w-7" />
        )}

        <div className="min-w-55 flex-1">
          {node.is_item && node.challenge_id ? (
            <Link
              className="text-sm font-medium hover:underline"
              href={`/${locale}/admin/challenges`}
            >
              {node.title}
            </Link>
          ) : (
            <p className="text-sm font-medium">{node.title}</p>
          )}
          <p className="text-xs text-muted-foreground">{t('tree.pathLabel', { path: node.path })}</p>
        </div>

        <Badge variant={node.is_item ? 'outline' : 'secondary'}>
          {node.is_item ? t('tree.badgeChallenge') : t('tree.badgeFolder')}
        </Badge>

        <Button variant="outline" size="sm" disabled={isMutating} onClick={() => void onReorder(node.id, Math.max(0, node.position - 1))}>
          <GripVertical className="h-4 w-4" />
          {t('actions.moveUp')}
        </Button>
        <Button variant="outline" size="sm" disabled={isMutating} onClick={() => void onReorder(node.id, node.position + 1)}>
          <GripVertical className="h-4 w-4" />
          {t('actions.moveDown')}
        </Button>
        <Button variant="outline" size="sm" disabled={isMutating} onClick={() => void handleMove()}>
          <FolderTree className="h-4 w-4" />
          {t('actions.move')}
        </Button>
        <Button variant="outline" size="sm" disabled={isMutating} onClick={() => void handleRename()}>
          <Pencil className="h-4 w-4" />
          {t('actions.rename')}
        </Button>
        <Button variant="destructive" size="sm" disabled={isMutating} onClick={() => void handleDelete()}>
          <Trash2 className="h-4 w-4" />
          {t('actions.delete')}
        </Button>
      </div>

      {!node.is_item && isExpanded ? (
        children.length > 0 ? (
          <ul className="space-y-2">
            {children.map((child) => (
              <AdminChallengeNodeRow
                key={child.id}
                locale={locale}
                node={child}
                depth={depth + 1}
                expandedNodeIds={expandedNodeIds}
                childrenByParentId={childrenByParentId}
                isNodeLoadingById={isNodeLoadingById}
                isMutating={isMutating}
                onToggle={onToggle}
                onRename={onRename}
                onMove={onMove}
                onReorder={onReorder}
                onDelete={onDelete}
              />
            ))}
          </ul>
        ) : isNodeLoadingById[node.id] ? (
          <p className="pl-8 text-xs text-muted-foreground">{t('tree.loadingChildren')}</p>
        ) : (
          <p className="pl-8 text-xs text-muted-foreground">{t('tree.emptyFolder')}</p>
        )
      ) : null}
    </li>
  )
}
