import Link from 'next/link'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type CourseNode } from '@/types/course.types'

type CourseTreeNodeItemProps = {
  locale: string
  slug: string
  node: CourseNode
  depth: number
  expandedNodeIds: number[]
  childrenByParentId: Record<number, CourseNode[]>
  isTreeLoadingByNodeId: Record<number, boolean>
  onToggleNode: (nodeId: number, isItem: boolean) => void
}

export function CourseTreeNodeItem({
  locale,
  slug,
  node,
  depth,
  expandedNodeIds,
  childrenByParentId,
  isTreeLoadingByNodeId,
  onToggleNode,
}: CourseTreeNodeItemProps) {
  const isExpanded = expandedNodeIds.includes(node.id)
  const isLoading = isTreeLoadingByNodeId[node.id] === true
  const children = childrenByParentId[node.id] ?? []

  return (
    <li className="space-y-2" style={{ marginLeft: depth * 12 }}>
      <div className="flex items-center gap-2">
        {!node.is_item ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onToggleNode(node.id, node.is_item)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <span className="inline-block h-7 w-7" />
        )}

        {node.is_item && node.lesson ? (
          <Link
            href={`/${locale}/courses/${slug}/lessons/${node.lesson.id}`}
            className="text-sm font-medium hover:underline"
          >
            {node.title}
          </Link>
        ) : (
          <p className="text-sm font-medium">{node.title}</p>
        )}

        {node.is_item ? (
          <Badge variant="outline" className="text-xs">
            Lesson
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Folder
          </Badge>
        )}

        {!node.is_item && isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {!node.is_item && isExpanded ? (
        children.length > 0 ? (
          <ul className="space-y-2">
            {children.map((child) => (
              <CourseTreeNodeItem
                key={child.id}
                locale={locale}
                slug={slug}
                node={child}
                depth={depth + 1}
                expandedNodeIds={expandedNodeIds}
                childrenByParentId={childrenByParentId}
                isTreeLoadingByNodeId={isTreeLoadingByNodeId}
                onToggleNode={onToggleNode}
              />
            ))}
          </ul>
        ) : !isLoading ? (
          <p className="pl-9 text-xs text-muted-foreground">Empty folder</p>
        ) : null
      ) : null}
    </li>
  )
}
