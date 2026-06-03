'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { useAdminLearnCourseTree } from '@/hooks/useAdminLearnCourseTree'
import type { AdminLearnNodeCreatePayload, CourseNode } from '@/types/course.types'
import { AdminLearnNodeCreateDialog } from './AdminLearnNodeCreateDialog'
import { AdminLearnNodeTree } from './AdminLearnNodeTree'

type AdminLearnTreeTabProps = {
  locale: string
  slug: string
}

/** Build node-by-id and parent-id lookups across root + cached children. */
const buildIndex = (
  rootNodes: CourseNode[],
  childrenByParentId: Record<number, CourseNode[]>
) => {
  const nodeById = new Map<number, CourseNode>()
  const parentIdByNodeId = new Map<number, number | null>()
  const siblingsByParentKey = new Map<string, CourseNode[]>()

  const register = (nodes: CourseNode[], parentId: number | null) => {
    siblingsByParentKey.set(String(parentId), nodes)
    for (const node of nodes) {
      nodeById.set(node.id, node)
      parentIdByNodeId.set(node.id, parentId)
      const children = childrenByParentId[node.id]
      if (children) {
        register(children, node.id)
      }
    }
  }

  register(rootNodes, null)
  return { nodeById, parentIdByNodeId, siblingsByParentKey }
}

export function AdminLearnTreeTab({ locale, slug }: AdminLearnTreeTabProps) {
  const t = useTranslations('adminLearn')
  const {
    treeState,
    isMutating,
    mutationErrorKey,
    loadRoot,
    expandNode,
    submitCreateFolder,
    submitCreateLessonNode,
    submitRenameNode,
    submitMoveNode,
    submitReorderSiblings,
    submitDeleteNode,
  } = useAdminLearnCourseTree()

  const [createParent, setCreateParent] = useState<{ id: number | null; label: string } | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    void loadRoot(slug)
  }, [loadRoot, slug])

  const index = useMemo(
    () => buildIndex(treeState.rootNodes, treeState.childrenByParentId),
    [treeState.rootNodes, treeState.childrenByParentId]
  )

  const handleCreate = async (payload: AdminLearnNodeCreatePayload): Promise<boolean> => {
    if (payload.is_item) {
      return submitCreateLessonNode(slug, payload)
    }
    return submitCreateFolder(slug, payload)
  }

  const openCreateRoot = () => setCreateParent({ id: null, label: t('tree.parentRoot') })
  const openCreateChild = (node: CourseNode) => setCreateParent({ id: node.id, label: node.title })

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? Number(event.over.id) : null
    if (overId == null) {
      setDropTargetId(null)
      return
    }
    const activeNodeId = Number(event.active.id)
    const overNode = index.nodeById.get(overId)
    const activeParent = index.parentIdByNodeId.get(activeNodeId) ?? null
    // Highlight a folder only when dropping there would actually move the node
    // (i.e. it's a different folder than its current parent).
    if (overNode && !overNode.is_item && overNode.id !== activeNodeId && overNode.id !== activeParent) {
      setDropTargetId(overNode.id)
    } else {
      setDropTargetId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeNodeId = Number(event.active.id)
    const overId = event.over ? Number(event.over.id) : null
    setDropTargetId(null)

    if (overId == null || overId === activeNodeId) {
      return
    }

    const activeParent = index.parentIdByNodeId.get(activeNodeId) ?? null
    const overNode = index.nodeById.get(overId)
    const overParent = index.parentIdByNodeId.get(overId) ?? null

    // Case 1: dropped directly on a different folder -> move into it.
    if (overNode && !overNode.is_item && overNode.id !== activeParent && overNode.id !== activeNodeId) {
      await submitMoveNode(slug, activeNodeId, overNode.id)
      return
    }

    // Case 2: dropped on a sibling in the same parent -> reorder that group.
    if (overParent === activeParent) {
      const siblings = index.siblingsByParentKey.get(String(activeParent)) ?? []
      const fromIndex = siblings.findIndex((n) => n.id === activeNodeId)
      const toIndex = siblings.findIndex((n) => n.id === overId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return
      }
      const orderedIds = arrayMove(siblings, fromIndex, toIndex).map((n) => n.id)
      await submitReorderSiblings(slug, activeParent, orderedIds)
    }
  }

  return (
    <div className="space-y-4">
      {treeState.errorMessageKey ? <p className="text-sm text-destructive">{t(treeState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <div className="rounded-md border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('tree.treeTitle')}</h3>
          <div className="flex gap-2">
            <Button size="sm" disabled={isMutating} onClick={openCreateRoot}>
              {t('tree.addRoot')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadRoot(slug)} disabled={isMutating || treeState.isRootLoading}>
              {t('actions.refresh')}
            </Button>
          </div>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{t('tree.dragHint')}</p>

        {treeState.isRootLoading ? (
          <p className="text-sm text-muted-foreground">{t('status.loadingTree')}</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <AdminLearnNodeTree
              locale={locale}
              rootNodes={treeState.rootNodes}
              expandedNodeIds={treeState.expandedNodeIds}
              childrenByParentId={treeState.childrenByParentId}
              isNodeLoadingById={treeState.isNodeLoadingById}
              isMutating={isMutating}
              dropTargetId={dropTargetId}
              onToggle={(node) => void expandNode(slug, node)}
              onRename={(nodeId, title) => submitRenameNode(slug, nodeId, title)}
              onDelete={(nodeId) => submitDeleteNode(slug, nodeId)}
              onAddChild={openCreateChild}
            />
          </DndContext>
        )}
      </div>

      <AdminLearnNodeCreateDialog
        open={createParent !== null}
        parentId={createParent?.id ?? null}
        parentLabel={createParent?.label ?? t('tree.parentRoot')}
        isSubmitting={isMutating}
        onOpenChange={(open) => !open && setCreateParent(null)}
        onCreate={handleCreate}
      />
    </div>
  )
}
