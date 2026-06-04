'use client'

import { useCallback, useState } from 'react'
import { useRef } from 'react'
import { mapQuizAdminErrorToMessageKey } from '@/lib/quiz-admin-error-map'
import {
  createAdminQuiz,
  createQuizCategory,
  createQuizTag,
  deleteAdminQuiz,
  deleteQuizCategory,
  deleteQuizTag,
  getQuizById,
  listAdminQuizzes,
  listQuizCategories,
  listQuizTags,
  updateAdminQuiz,
  updateQuizCategory,
  updateQuizTag,
} from '@/services/quizzes.service'
import type {
  AdminQuizListParams,
  AdminQuizMutationPayload,
  Quiz,
  QuizCategory,
  QuizCategoryMutationPayload,
  QuizTag,
  QuizTagMutationPayload,
} from '@/types/quiz.types'

const PAGE_SIZE = 20

interface QuizListState {
  data: Quiz[]
  isLoading: boolean
  errorMessageKey: string | null
}

interface QuizDetailState {
  data: Quiz | null
  isLoading: boolean
  errorMessageKey: string | null
}

interface QuizPagination {
  count: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

interface QuizTaxonomyState {
  categories: QuizCategory[]
  tags: QuizTag[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_LIST_STATE: QuizListState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_DETAIL_STATE: QuizDetailState = {
  data: null,
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_PAGINATION: QuizPagination = {
  count: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  hasNext: false,
  hasPrevious: false,
}

const EMPTY_TAXONOMY_STATE: QuizTaxonomyState = {
  categories: [],
  tags: [],
  isLoading: false,
  errorMessageKey: null,
}

export const useAdminQuizzes = () => {
  const [listState, setListState] = useState<QuizListState>(EMPTY_LIST_STATE)
  const [detailState, setDetailState] = useState<QuizDetailState>(EMPTY_DETAIL_STATE)
  const [paginationState, setPaginationState] = useState<QuizPagination>(EMPTY_PAGINATION)
  const [taxonomyState, setTaxonomyState] = useState<QuizTaxonomyState>(EMPTY_TAXONOMY_STATE)
  const [, setActiveParams] = useState<AdminQuizListParams>({})
  const activeParamsRef = useRef<AdminQuizListParams>({})
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadList = useCallback(async (params?: AdminQuizListParams) => {
    const mergedParams: AdminQuizListParams = {
      ...activeParamsRef.current,
      ...(params ?? {}),
      limit: params?.limit ?? activeParamsRef.current.limit ?? PAGE_SIZE,
    }

    activeParamsRef.current = mergedParams
    setActiveParams(mergedParams)
    setListState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const result = await listAdminQuizzes(mergedParams)
      const page = mergedParams.offset ? Math.floor(mergedParams.offset / PAGE_SIZE) + 1 : 1
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
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'errors.loadFailed'),
      }))
    }
  }, [])

  const loadPage = useCallback(async (page: number) => {
    const offset = (Math.max(page, 1) - 1) * PAGE_SIZE
    await loadList({ ...activeParamsRef.current, offset })
  }, [loadList])

  const loadDetail = useCallback(async (quizId: number) => {
    setDetailState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const quiz = await getQuizById(quizId)
      setDetailState({ data: quiz, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setDetailState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'errors.detailLoadFailed'),
      }))
    }
  }, [])

  const submitCreate = useCallback(async (payload: AdminQuizMutationPayload): Promise<Quiz | null> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const created = await createAdminQuiz(payload)
      await loadList({ ...activeParamsRef.current })
      return created
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'errors.createFailed'))
      return null
    } finally {
      setIsMutating(false)
    }
  }, [loadList])

  const submitUpdate = useCallback(async (
    quizId: number,
    payload: Partial<AdminQuizMutationPayload>
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const updated = await updateAdminQuiz(quizId, payload)
      setDetailState({ data: updated, isLoading: false, errorMessageKey: null })
      await loadList({ ...activeParamsRef.current })
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'errors.updateFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadList])

  const submitDelete = useCallback(async (quizId: number): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminQuiz(quizId)
      await loadList({ ...activeParamsRef.current })
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'errors.deleteFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadList])

  // ── Taxonomy (categories + tags) ────────────────────────────────────────────

  const loadTaxonomies = useCallback(async () => {
    setTaxonomyState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const [categories, tags] = await Promise.all([listQuizCategories(), listQuizTags()])
      setTaxonomyState({ categories, tags, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setTaxonomyState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'errors.loadTaxonomyFailed'),
      }))
    }
  }, [])

  const runMutation = useCallback(async <T>(fn: () => Promise<T>, fallbackKey: string): Promise<T | null> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      return await fn()
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, fallbackKey))
      return null
    } finally {
      setIsMutating(false)
    }
  }, [])

  const submitCreateCategory = useCallback(async (payload: QuizCategoryMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => createQuizCategory(payload), 'errors.createCategoryFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitUpdateCategory = useCallback(async (id: number, payload: QuizCategoryMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => updateQuizCategory(id, payload), 'errors.updateCategoryFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitDeleteCategory = useCallback(async (id: number): Promise<boolean> => {
    const ok = await runMutation(async () => { await deleteQuizCategory(id) }, 'errors.deleteCategoryFailed')
    if (ok !== null) await loadTaxonomies()
    return ok !== null
  }, [loadTaxonomies, runMutation])

  const submitCreateTag = useCallback(async (payload: QuizTagMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => createQuizTag(payload), 'errors.createTagFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitUpdateTag = useCallback(async (id: number, payload: QuizTagMutationPayload): Promise<boolean> => {
    const ok = await runMutation(() => updateQuizTag(id, payload), 'errors.updateTagFailed')
    if (ok) await loadTaxonomies()
    return Boolean(ok)
  }, [loadTaxonomies, runMutation])

  const submitDeleteTag = useCallback(async (id: number): Promise<boolean> => {
    const ok = await runMutation(async () => { await deleteQuizTag(id) }, 'errors.deleteTagFailed')
    if (ok !== null) await loadTaxonomies()
    return ok !== null
  }, [loadTaxonomies, runMutation])

  return {
    listState,
    detailState,
    paginationState,
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadList,
    loadPage,
    loadDetail,
    loadTaxonomies,
    submitCreate,
    submitUpdate,
    submitDelete,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
  }
}
