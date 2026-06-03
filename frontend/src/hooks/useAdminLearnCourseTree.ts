'use client'

import { useCallback, useState } from 'react'
import { mapLearnAdminErrorToMessageKey } from '@/lib/learn-admin-error-map'
import {
  createAdminLearnNode,
  deleteAdminLearnNode,
  listAdminLearnNodeChildren,
  listAdminLearnRootNodes,
  reorderAdminLearnNodes,
  updateAdminLearnNode,
} from '@/services/courses.service'
import { LessonType } from '@/types/course.types'
import type {
  AdminLearnNodeCreatePayload,
  AdminLearnNodeUpdatePayload,
  CourseNode,
} from '@/types/course.types'

type TreeState = {
  rootNodes: CourseNode[]
  childrenByParentId: Record<number, CourseNode[]>
  expandedNodeIds: number[]
  isRootLoading: boolean
  isNodeLoadingById: Record<number, boolean>
  errorMessageKey: string | null
}

const EMPTY_TREE_STATE: TreeState = {
  rootNodes: [],
  childrenByParentId: {},
  expandedNodeIds: [],
  isRootLoading: false,
  isNodeLoadingById: {},
  errorMessageKey: null,
}

export const useAdminLearnCourseTree = () => {
  const [treeState, setTreeState] = useState<TreeState>(EMPTY_TREE_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadRoot = useCallback(async (slug: string) => {
    setTreeState((s) => ({ ...s, isRootLoading: true, errorMessageKey: null }))

    try {
      const nodes = await listAdminLearnRootNodes(slug)
      setTreeState((s) => ({ ...s, rootNodes: nodes, isRootLoading: false, errorMessageKey: null }))
    } catch (error) {
      setTreeState((s) => ({
        ...s,
        isRootLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'errors.loadTreeFailed'),
      }))
    }
  }, [])

  const loadChildren = useCallback(async (slug: string, parentId: number) => {
    setTreeState((s) => ({
      ...s,
      isNodeLoadingById: {
        ...s.isNodeLoadingById,
        [parentId]: true,
      },
      errorMessageKey: null,
    }))

    try {
      const children = await listAdminLearnNodeChildren(slug, parentId)
      setTreeState((s) => ({
        ...s,
        childrenByParentId: {
          ...s.childrenByParentId,
          [parentId]: children,
        },
        isNodeLoadingById: {
          ...s.isNodeLoadingById,
          [parentId]: false,
        },
      }))
    } catch (error) {
      setTreeState((s) => ({
        ...s,
        isNodeLoadingById: {
          ...s.isNodeLoadingById,
          [parentId]: false,
        },
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'errors.loadTreeChildrenFailed'),
      }))
    }
  }, [])

  const refreshTree = useCallback(async (slug: string) => {
    // Reload root + re-fetch children of every currently-expanded folder.
    // Clearing childrenByParentId alone would leave expanded folders showing an
    // empty body (the row stays expanded but its child cache is gone and nothing
    // re-triggers loadChildren) — that was the "empty folder after create" bug.
    const expandedIds = treeState.expandedNodeIds

    const [rootNodes, ...childrenResults] = await Promise.all([
      listAdminLearnRootNodes(slug),
      ...expandedIds.map((id) =>
        listAdminLearnNodeChildren(slug, id)
          .then((children) => ({ id, children }))
          .catch(() => null)
      ),
    ])

    const nextChildrenByParentId: Record<number, CourseNode[]> = {}
    for (const result of childrenResults) {
      if (result) {
        nextChildrenByParentId[result.id] = result.children
      }
    }

    setTreeState((s) => ({
      ...s,
      rootNodes,
      childrenByParentId: nextChildrenByParentId,
      errorMessageKey: null,
    }))
  }, [treeState.expandedNodeIds])

  const expandNode = useCallback(async (slug: string, node: CourseNode) => {
    if (node.is_item) {
      return
    }

    const isExpanded = treeState.expandedNodeIds.includes(node.id)
    setTreeState((s) => ({
      ...s,
      expandedNodeIds: isExpanded
        ? s.expandedNodeIds.filter((id) => id !== node.id)
        : [...s.expandedNodeIds, node.id],
    }))

    if (isExpanded) {
      return
    }

    if (!Object.prototype.hasOwnProperty.call(treeState.childrenByParentId, node.id)) {
      await loadChildren(slug, node.id)
    }
  }, [loadChildren, treeState.childrenByParentId, treeState.expandedNodeIds])

  const runMutation = useCallback(async (
    slug: string,
    fn: () => Promise<void>,
    fallbackKey: string
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await fn()
      await refreshTree(slug)
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, fallbackKey))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [refreshTree])

  const submitCreateFolder = useCallback(async (slug: string, payload: AdminLearnNodeCreatePayload) => {
    return runMutation(slug, async () => {
      await createAdminLearnNode(slug, payload)
    }, 'errors.createFolderFailed')
  }, [runMutation])

  const submitCreateLessonNode = useCallback(async (slug: string, payload: AdminLearnNodeCreatePayload) => {
    const lesson = payload.lesson
    if (lesson?.lesson_type === LessonType.Markdown && !(lesson.content_md ?? '').trim()) {
      setMutationErrorKey('errors.markdownContentRequired')
      return false
    }
    if (lesson?.lesson_type === LessonType.Video && !(lesson.video_url ?? '').trim()) {
      setMutationErrorKey('errors.videoUrlRequired')
      return false
    }

    return runMutation(slug, async () => {
      await createAdminLearnNode(slug, payload)
    }, 'errors.createLessonNodeFailed')
  }, [runMutation])

  const submitRenameNode = useCallback(async (slug: string, nodeId: number, title: string) => {
    return runMutation(slug, async () => {
      const payload: AdminLearnNodeUpdatePayload = { title }
      await updateAdminLearnNode(slug, nodeId, payload)
    }, 'errors.renameNodeFailed')
  }, [runMutation])

  const submitMoveNode = useCallback(async (slug: string, nodeId: number, parentId: number | null) => {
    return runMutation(slug, async () => {
      const payload: AdminLearnNodeUpdatePayload = { parent_id: parentId }
      await updateAdminLearnNode(slug, nodeId, payload)
    }, 'errors.moveNodeFailed')
  }, [runMutation])

  const submitReorderSiblings = useCallback(async (
    slug: string,
    parentId: number | null,
    orderedIds: number[]
  ) => {
    return runMutation(slug, async () => {
      await reorderAdminLearnNodes(slug, parentId, orderedIds)
    }, 'errors.reorderNodeFailed')
  }, [runMutation])

  const submitDeleteNode = useCallback(async (slug: string, nodeId: number) => {
    return runMutation(slug, async () => {
      await deleteAdminLearnNode(slug, nodeId)
    }, 'errors.deleteNodeFailed')
  }, [runMutation])

  return {
    treeState,
    isMutating,
    mutationErrorKey,
    loadRoot,
    loadChildren,
    refreshTree,
    expandNode,
    submitCreateFolder,
    submitCreateLessonNode,
    submitRenameNode,
    submitMoveNode,
    submitReorderSiblings,
    submitDeleteNode,
  }
}
