import { useTranslations } from 'next-intl'
import { type CourseNode } from '@/types/course.types'
import { CourseTreeNodeItem } from './CourseTreeNodeItem'

type CourseTreePanelProps = {
  locale: string
  slug: string
  rootNodes: CourseNode[]
  expandedNodeIds: number[]
  childrenByParentId: Record<number, CourseNode[]>
  isTreeLoadingByNodeId: Record<number, boolean>
  onToggleNode: (nodeId: number, isItem: boolean) => void
}

export function CourseTreePanel({
  locale,
  slug,
  rootNodes,
  expandedNodeIds,
  childrenByParentId,
  isTreeLoadingByNodeId,
  onToggleNode,
}: CourseTreePanelProps) {
  const t = useTranslations('courses')

  if (rootNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty.noNodes')}</p>
  }

  return (
    <ul className="space-y-2">
      {rootNodes.map((node) => (
        <CourseTreeNodeItem
          key={node.id}
          locale={locale}
          slug={slug}
          node={node}
          depth={0}
          expandedNodeIds={expandedNodeIds}
          childrenByParentId={childrenByParentId}
          isTreeLoadingByNodeId={isTreeLoadingByNodeId}
          onToggleNode={onToggleNode}
        />
      ))}
    </ul>
  )
}
