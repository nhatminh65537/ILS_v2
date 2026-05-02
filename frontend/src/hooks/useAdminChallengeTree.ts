'use client'

import { useCallback, useState } from 'react'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  createChallengeNode,
  deleteChallengeNode,
  listChallengeNodeChildren,
  listChallengeRootNodes,
  moveChallengeNode,
  updateChallengeNode,
} from '@/services/challenges.service'
import type {
  AdminChallengeNodeCreatePayload,
  AdminChallengeNodeUpdatePayload,
  ChallengeNode,
} from '@/types/challenge.types'

type TreeState = {
  rootNodes: ChallengeNode[]
  childrenByParentId: Record<number, ChallengeNode[]>
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

export const useAdminChallengeTree = () => {
  const [treeState, setTreeState] = useState<TreeState>(EMPTY_TREE_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadRoot = useCallback(async () => {
    setTreeState((s) => ({ ...s, isRootLoading: true, errorMessageKey: null }))

    try {
      const nodes = await listChallengeRootNodes()
      setTreeState((s) => ({ ...s, rootNodes: nodes, isRootLoading: false, errorMessageKey: null }))
    } catch (error) {
      setTreeState((s) => ({
        ...s,
        isRootLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadTreeFailed'),
      }))
    }
  }, [])

  const loadChildren = useCallback(async (parentId: number) => {
    setTreeState((s) => ({
      ...s,
      isNodeLoadingById: { ...s.isNodeLoadingById, [parentId]: true },
      errorMessageKey: null,
    }))

    try {
      const children = await listChallengeNodeChildren(parentId)
      setTreeState((s) => ({
        ...s,
        childrenByParentId: { ...s.childrenByParentId, [parentId]: children },
        isNodeLoadingById: { ...s.isNodeLoadingById, [parentId]: false },
      }))
    } catch (error) {
      setTreeState((s) => ({
        ...s,
        isNodeLoadingById: { ...s.isNodeLoadingById, [parentId]: false },
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadTreeChildrenFailed'),
      }))
    }
  }, [])

  const refreshTree = useCallback(async () => {
    setTreeState((s) => ({ ...s, childrenByParentId: {} }))
    await loadRoot()
  }, [loadRoot])

  const expandNode = useCallback(async (node: ChallengeNode) => {
    if (node.is_item) return

    const isExpanded = treeState.expandedNodeIds.includes(node.id)
    setTreeState((s) => ({
      ...s,
      expandedNodeIds: isExpanded
        ? s.expandedNodeIds.filter((id) => id !== node.id)
        : [...s.expandedNodeIds, node.id],
    }))

    if (isExpanded) return

    if (!Object.prototype.hasOwnProperty.call(treeState.childrenByParentId, node.id)) {
      await loadChildren(node.id)
    }
  }, [loadChildren, treeState.childrenByParentId, treeState.expandedNodeIds])

  const runMutation = useCallback(async (fn: () => Promise<void>, fallbackKey: string): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await fn()
      await refreshTree()
      return true
    } catch (error) {
      setMutationErrorKey(mapChallengeAdminErrorToMessageKey(error, fallbackKey))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [refreshTree])

  const submitCreateFolder = useCallback(async (payload: AdminChallengeNodeCreatePayload) => {
    return runMutation(async () => { await createChallengeNode(payload) }, 'adminChallenges.errors.createFolderFailed')
  }, [runMutation])

  const submitCreateChallengeNode = useCallback(async (payload: AdminChallengeNodeCreatePayload) => {
    return runMutation(async () => { await createChallengeNode(payload) }, 'adminChallenges.errors.createNodeFailed')
  }, [runMutation])

  const submitRenameNode = useCallback(async (nodeId: number, title: string) => {
    return runMutation(async () => {
      const p: AdminChallengeNodeUpdatePayload = { title }
      await updateChallengeNode(nodeId, p)
    }, 'adminChallenges.errors.renameNodeFailed')
  }, [runMutation])

  const submitMoveNode = useCallback(async (nodeId: number, parentId: number | null) => {
    return runMutation(async () => {
      await moveChallengeNode(nodeId, { parent_id: parentId })
    }, 'adminChallenges.errors.moveNodeFailed')
  }, [runMutation])

  const submitReorderNode = useCallback(async (nodeId: number, position: number) => {
    return runMutation(async () => {
      const p: AdminChallengeNodeUpdatePayload = { position }
      await updateChallengeNode(nodeId, p)
    }, 'adminChallenges.errors.reorderNodeFailed')
  }, [runMutation])

  const submitDeleteNode = useCallback(async (nodeId: number) => {
    return runMutation(async () => { await deleteChallengeNode(nodeId) }, 'adminChallenges.errors.deleteNodeFailed')
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
    submitCreateChallengeNode,
    submitRenameNode,
    submitMoveNode,
    submitReorderNode,
    submitDeleteNode,
  }
}
