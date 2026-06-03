'use client'

import { useCallback, useState } from 'react'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  createChallengeNode,
  deleteChallengeNode,
  listChallengeFolderContents,
  moveChallengeNode,
} from '@/services/challenges.service'
import type {
  ChallengeBreadcrumbCrumb,
  ChallengeExplorerNode,
} from '@/types/challenge.types'

type ExplorerState = {
  folder: { id: number; title: string; path: string } | null
  breadcrumb: ChallengeBreadcrumbCrumb[]
  nodes: ChallengeExplorerNode[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_STATE: ExplorerState = {
  folder: null,
  breadcrumb: [],
  nodes: [],
  isLoading: false,
  errorMessageKey: null,
}

export const useAdminChallengeExplorer = () => {
  const [state, setState] = useState<ExplorerState>(EMPTY_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadFolder = useCallback(async (folderId: number | null) => {
    setState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))
    try {
      const data = await listChallengeFolderContents(folderId)
      setState({
        folder: data.folder,
        breadcrumb: [...data.breadcrumb],
        nodes: [...data.nodes],
        isLoading: false,
        errorMessageKey: null,
      })
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'errors.loadTreeFailed'),
      }))
    }
  }, [])

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackKey: string): Promise<T | null> => {
      setIsMutating(true)
      setMutationErrorKey(null)
      try {
        return await fn()
      } catch (error) {
        setMutationErrorKey(mapChallengeAdminErrorToMessageKey(error, fallbackKey))
        return null
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const createFolder = useCallback(
    async (title: string, parentId: number | null): Promise<boolean> => {
      const created = await runMutation(
        () => createChallengeNode({ title, parent_id: parentId, is_item: false }),
        'errors.createFolderFailed'
      )
      if (created) await loadFolder(parentId)
      return Boolean(created)
    },
    [loadFolder, runMutation]
  )

  /** Atomically create a draft challenge node; returns the new challenge slug. */
  const createChallengeDraft = useCallback(
    async (title: string, parentId: number | null): Promise<string | null> => {
      const created = await runMutation(
        () => createChallengeNode({ title, parent_id: parentId, is_item: true }),
        'errors.createNodeFailed'
      )
      if (created) await loadFolder(parentId)
      return created?.challenge_slug ?? null
    },
    [loadFolder, runMutation]
  )

  const moveNode = useCallback(
    async (nodeId: number, parentId: number | null, reloadFolderId: number | null): Promise<boolean> => {
      const ok = await runMutation(
        async () => {
          await moveChallengeNode(nodeId, { parent_id: parentId })
        },
        'errors.moveNodeFailed'
      )
      if (ok !== null) await loadFolder(reloadFolderId)
      return ok !== null
    },
    [loadFolder, runMutation]
  )

  const bulkDelete = useCallback(
    async (nodeIds: number[], reloadFolderId: number | null): Promise<boolean> => {
      const ok = await runMutation(async () => {
        for (const id of nodeIds) {
          await deleteChallengeNode(id)
        }
      }, 'errors.deleteNodeFailed')
      if (ok !== null) await loadFolder(reloadFolderId)
      return ok !== null
    },
    [loadFolder, runMutation]
  )

  return {
    state,
    isMutating,
    mutationErrorKey,
    loadFolder,
    createFolder,
    createChallengeDraft,
    moveNode,
    bulkDelete,
  }
}
