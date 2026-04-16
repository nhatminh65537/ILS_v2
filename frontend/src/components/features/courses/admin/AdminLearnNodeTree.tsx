import { useTranslations } from 'next-intl'
import type { CourseNode } from '@/types/course.types'
import { AdminLearnNodeRow } from './AdminLearnNodeRow'

type AdminLearnNodeTreeProps = {
  locale: string
  slug: string
  rootNodes: CourseNode[]
  expandedNodeIds: number[]
  childrenByParentId: Record<number, CourseNode[]>
  isNodeLoadingById: Record<number, boolean>
  isMutating: boolean
  onToggle: (node: CourseNode) => void
  onRename: (nodeId: number, title: string) => Promise<boolean>
  onMove: (nodeId: number, parentId: number | null) => Promise<boolean>
  onReorder: (nodeId: number, position: number) => Promise<boolean>
  onDelete: (nodeId: number) => Promise<boolean>
}

export function AdminLearnNodeTree({
  locale,
  slug,
  rootNodes,
  expandedNodeIds,
  childrenByParentId,
  isNodeLoadingById,
  isMutating,
  onToggle,
  onRename,
  onMove,
  onReorder,
  onDelete,
}: AdminLearnNodeTreeProps) {
  const t = useTranslations('adminLearn')

  if (rootNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty.noNodes')}</p>
  }

  return (
    <ul className="space-y-2">
      {rootNodes.map((node) => (
        <AdminLearnNodeRow
          key={node.id}
          locale={locale}
          slug={slug}
          node={node}
          depth={0}
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
  )
}
