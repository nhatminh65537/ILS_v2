'use client'

import { useTranslations } from 'next-intl'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CourseNode } from '@/types/course.types'
import { AdminLearnNodeRow } from './AdminLearnNodeRow'

type AdminLearnNodeTreeProps = {
  locale: string
  rootNodes: CourseNode[]
  expandedNodeIds: number[]
  childrenByParentId: Record<number, CourseNode[]>
  isNodeLoadingById: Record<number, boolean>
  isMutating: boolean
  dropTargetId: number | null
  onToggle: (node: CourseNode) => void
  onRename: (nodeId: number, title: string) => Promise<boolean>
  onDelete: (nodeId: number) => Promise<boolean>
  onAddChild: (node: CourseNode) => void
}

export function AdminLearnNodeTree({
  locale,
  rootNodes,
  expandedNodeIds,
  childrenByParentId,
  isNodeLoadingById,
  isMutating,
  dropTargetId,
  onToggle,
  onRename,
  onDelete,
  onAddChild,
}: AdminLearnNodeTreeProps) {
  const t = useTranslations('adminLearn')

  // Recursively render a sibling group inside its own SortableContext so each
  // parent owns an independent ordered list (reorder stays scoped to siblings).
  const renderSiblingGroup = (siblings: CourseNode[], depth: number) => {
    if (siblings.length === 0) {
      return <p className="pl-8 text-xs text-muted-foreground">{t('tree.emptyFolder')}</p>
    }

    return (
      <SortableContext items={siblings.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {siblings.map((node) => (
            <AdminLearnNodeRow
              key={node.id}
              locale={locale}
              node={node}
              depth={depth}
              expandedNodeIds={expandedNodeIds}
              childrenByParentId={childrenByParentId}
              isNodeLoadingById={isNodeLoadingById}
              isMutating={isMutating}
              dropTargetId={dropTargetId}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
              onAddChild={onAddChild}
              renderChildren={(parent) =>
                renderSiblingGroup(childrenByParentId[parent.id] ?? [], depth + 1)
              }
            />
          ))}
        </ul>
      </SortableContext>
    )
  }

  if (rootNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty.noNodes')}</p>
  }

  return renderSiblingGroup(rootNodes, 0)
}
