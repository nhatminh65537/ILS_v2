'use client'

import { useCallback, useRef, useState } from 'react'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  createChallengeCategory,
  createChallengeTag,
  createChallenge,
  deleteChallengeCategory,
  deleteChallengeTag,
  deleteChallenge,
  getChallengeBySlug,
  listChallengeCategories,
  listChallenges,
  listChallengeTags,
  updateChallengeCategory,
  updateChallengeTag,
  updateChallenge,
} from '@/services/challenges.service'
import type {
  Challenge,
  ChallengeCategory,
  ChallengeCategoryMutationPayload,
  ChallengeTag,
  ChallengeTagMutationPayload,
  CreateChallengePayload,
  UpdateChallengePayload,
} from '@/types/challenge.types'

const PAGE_SIZE = 20

type ListState = {
  data: Challenge[]
  isLoading: boolean
  errorMessageKey: string | null
}

type DetailState = {
  data: Challenge | null
  isLoading: boolean
  errorMessageKey: string | null
}

type TaxonomyState = {
  categories: ChallengeCategory[]
  tags: ChallengeTag[]
  isLoading: boolean
  errorMessageKey: string | null
}

type PaginationState = {
  count: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

const EMPTY_LIST_STATE: ListState = { data: [], isLoading: false, errorMessageKey: null }
const EMPTY_DETAIL_STATE: DetailState = { data: null, isLoading: false, errorMessageKey: null }
const EMPTY_TAXONOMY_STATE: TaxonomyState = { categories: [], tags: [], isLoading: false, errorMessageKey: null }
const EMPTY_PAGINATION: PaginationState = { count: 0, page: 1, pageSize: PAGE_SIZE, hasNext: false, hasPrevious: false }

export const useAdminChallenges = () => {
  const [listState, setListState] = useState<ListState>(EMPTY_LIST_STATE)
  const [detailState, setDetailState] = useState<DetailState>(EMPTY_DETAIL_STATE)
  const [taxonomyState, setTaxonomyState] = useState<TaxonomyState>(EMPTY_TAXONOMY_STATE)
  const [paginationState, setPaginationState] = useState<PaginationState>(EMPTY_PAGINATION)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const activeParamsRef = useRef<Record<string, unknown>>({ limit: PAGE_SIZE })

  const loadChallengeList = useCallback(async (params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
    const merged = { ...activeParamsRef.current, ...(params ?? {}), limit: PAGE_SIZE }
    activeParamsRef.current = merged
    setListState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const result = await listChallenges(merged)
      const page = merged.offset ? Math.floor((merged.offset as number) / PAGE_SIZE) + 1 : 1
      setListState({ data: result.items, isLoading: false, errorMessageKey: null })
      setPaginationState({
        count: result.count,
        page,
        pageSize: PAGE_SIZE,
        hasNext: Boolean(result.next),
        hasPrevious: Boolean(result.previous),
      })
    } catch (error) {
      setListState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadListFailed'),
      }))
    }
  }, [])

  const loadChallengePage = useCallback(async (page: number) => {
    const offset = (Math.max(page, 1) - 1) * PAGE_SIZE
    await loadChallengeList({ ...activeParamsRef.current as Record<string, string>, offset })
  }, [loadChallengeList])

  const loadChallengeDetail = useCallback(async (slug: string) => {
    setDetailState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const detail = await getChallengeBySlug(slug)
      setDetailState({ data: detail, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setDetailState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadDetailFailed'),
      }))
    }
  }, [])

  const loadTaxonomies = useCallback(async () => {
    setTaxonomyState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const [categories, tags] = await Promise.all([listChallengeCategories(), listChallengeTags()])
      setTaxonomyState({ categories, tags, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setTaxonomyState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadTaxonomyFailed'),
      }))
    }
  }, [])

  const runMutation = useCallback(async <T>(fn: () => Promise<T>, fallbackKey: string): Promise<T | null> => {
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
  }, [])

  const submitCreateChallenge = useCallback(async (payload: CreateChallengePayload): Promise<Challenge | null> => {
    const created = await runMutation(() => createChallenge(payload), 'adminChallenges.errors.createFailed')
    if (created) await loadChallengeList({ ...activeParamsRef.current as Record<string, string> })
    return created
  }, [loadChallengeList, runMutation])

  const submitUpdateChallenge = useCallback(async (slug: string, payload: UpdateChallengePayload): Promise<boolean> => {
    const updated = await runMutation(() => updateChallenge(slug, payload), 'adminChallenges.errors.updateFailed')
    if (updated) setDetailState({ data: updated, isLoading: false, errorMessageKey: null })
    return Boolean(updated)
  }, [runMutation])

  const submitDeleteChallenge = useCallback(async (slug: string): Promise<boolean> => {
    const ok = await runMutation(async () => { await deleteChallenge(slug) }, 'adminChallenges.errors.deleteFailed')
    if (ok !== null) await loadChallengeList({ ...activeParamsRef.current as Record<string, string> })
    return ok !== null
  }, [loadChallengeList, runMutation])

  const submitStatusToggle = useCallback(async (challenge: Challenge, nextStatus: string): Promise<boolean> => {
    return submitUpdateChallenge(challenge.slug, { status: nextStatus as 'draft' | 'published' | 'archived' })
  }, [submitUpdateChallenge])

  const submitCreateCategory = useCallback(async (payload: ChallengeCategoryMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => createChallengeCategory(payload), 'adminChallenges.errors.createCategoryFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitUpdateCategory = useCallback(async (id: number, payload: ChallengeCategoryMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => updateChallengeCategory(id, payload), 'adminChallenges.errors.updateCategoryFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitDeleteCategory = useCallback(async (id: number): Promise<boolean> => {
    const ok = await runMutation(async () => { await deleteChallengeCategory(id) }, 'adminChallenges.errors.deleteCategoryFailed')
    if (ok !== null) await loadTaxonomies()
    return ok !== null
  }, [loadTaxonomies, runMutation])

  const submitCreateTag = useCallback(async (payload: ChallengeTagMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => createChallengeTag(payload), 'adminChallenges.errors.createTagFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitUpdateTag = useCallback(async (id: number, payload: ChallengeTagMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => updateChallengeTag(id, payload), 'adminChallenges.errors.updateTagFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitDeleteTag = useCallback(async (id: number): Promise<boolean> => {
    const ok = await runMutation(async () => { await deleteChallengeTag(id) }, 'adminChallenges.errors.deleteTagFailed')
    if (ok !== null) await loadTaxonomies()
    return ok !== null
  }, [loadTaxonomies, runMutation])

  return {
    listState,
    detailState,
    taxonomyState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadChallengeList,
    loadChallengePage,
    loadChallengeDetail,
    loadTaxonomies,
    submitCreateChallenge,
    submitUpdateChallenge,
    submitDeleteChallenge,
    submitStatusToggle,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
  }
}
