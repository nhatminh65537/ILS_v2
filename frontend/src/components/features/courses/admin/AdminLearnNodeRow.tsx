'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { CourseNode } from '@/types/course.types'
import { AdminLearnNodeRenameDialog } from './AdminLearnNodeRenameDialog'

type AdminLearnNodeRowProps = {
  locale: string
  node: CourseNode
  depth: number
  expandedNodeIds: number[]
  childrenByParentId: Record<number, CourseNode[]>
  isNodeLoadingById: Record<number, boolean>
  isMutating: boolean
  /** id of the folder currently highlighted as a move target during drag. */
  dropTargetId: number | null
  onToggle: (node: CourseNode) => void
  onRename: (nodeId: number, title: string) => Promise<boolean>
  onDelete: (nodeId: number) => Promise<boolean>
  onAddChild: (node: CourseNode) => void
  renderChildren: (parent: CourseNode) => React.ReactNode
}

export function AdminLearnNodeRow({
  locale,
  node,
  depth,
  expandedNodeIds,
  isNodeLoadingById,
  isMutating,
  dropTargetId,
  onToggle,
  onRename,
  onDelete,
  onAddChild,
  renderChildren,
}: AdminLearnNodeRowProps) {
  const t = useTranslations('adminLearn')
  const isExpanded = expandedNodeIds.includes(node.id)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    marginLeft: depth * 14,
    opacity: isDragging ? 0.5 : 1,
  }

  const isDropTarget = dropTargetId === node.id

  return (
    <li ref={setNodeRef} style={style} className="space-y-2">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-md border p-2 ${
          isDropTarget ? 'border-primary ring-1 ring-primary' : 'border-border'
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 cursor-grab p-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        {!node.is_item ? (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onToggle(node)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <span className="inline-block h-7 w-7" />
        )}

        <div className="min-w-55 flex-1">
          {node.is_item && node.lesson ? (
            <Link className="text-sm font-medium hover:underline" href={`/${locale}/admin/learn/lessons/${node.lesson.id}`}>
              {node.title}
            </Link>
          ) : (
            <p className="text-sm font-medium">{node.title}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{t('tree.orderLabel', { position: node.position })}</span>
            {node.is_item && node.lesson ? (
              <>
                <span>{t('tree.pointLabel', { point: node.lesson.learning_point ?? 0 })}</span>
                <span>{t('tree.timeLabel', { time: node.lesson.learning_time ?? 0 })}</span>
              </>
            ) : null}
          </div>
        </div>

        <Badge variant={node.is_item ? 'outline' : 'secondary'}>
          {node.is_item ? t('tree.badgeLesson') : t('tree.badgeFolder')}
        </Badge>

        {!node.is_item ? (
          <Button variant="outline" size="sm" disabled={isMutating} onClick={() => onAddChild(node)}>
            <Plus className="h-4 w-4" />
            {t('tree.addChild')}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" disabled={isMutating} onClick={() => setRenameOpen(true)}>
          <Pencil className="h-4 w-4" />
          {t('actions.rename')}
        </Button>
        <Button variant="destructive" size="sm" disabled={isMutating} onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
          {t('actions.delete')}
        </Button>
      </div>

      {!node.is_item && isExpanded ? (
        isNodeLoadingById[node.id] ? (
          <p className="pl-8 text-xs text-muted-foreground">{t('tree.loadingChildren')}</p>
        ) : (
          renderChildren(node)
        )
      ) : null}

      <AdminLearnNodeRenameDialog
        open={renameOpen}
        initialTitle={node.title}
        isSubmitting={isMutating}
        onOpenChange={setRenameOpen}
        onRename={(title) => onRename(node.id, title)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t('tree.deleteTitle')}
        description={t('tree.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={async () => {
          const ok = await onDelete(node.id)
          if (ok) {
            setDeleteOpen(false)
          }
        }}
        onOpenChange={setDeleteOpen}
      />
    </li>
  )
}
