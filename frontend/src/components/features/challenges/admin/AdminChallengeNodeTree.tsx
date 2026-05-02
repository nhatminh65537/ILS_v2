import { useTranslations } from 'next-intl'
import type { ChallengeNode } from '@/types/challenge.types'
import { AdminChallengeNodeRow } from './AdminChallengeNodeRow'

type AdminChallengeNodeTreeProps = {
  locale: string
  rootNodes: ChallengeNode[]
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

export function AdminChallengeNodeTree({
  locale,
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
}: AdminChallengeNodeTreeProps) {
  const t = useTranslations('adminChallenges')

  if (rootNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty.noNodes')}</p>
  }

  return (
    <ul className="space-y-2">
      {rootNodes.map((node) => (
        <AdminChallengeNodeRow
          key={node.id}
          locale={locale}
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
