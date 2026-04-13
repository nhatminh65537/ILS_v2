'use client'

import { useCallback, useState } from 'react'
import { useRef } from 'react'
import { mapQuizAdminErrorToMessageKey } from '@/lib/quiz-admin-error-map'
import {
  createAdminQuiz,
  deleteAdminQuiz,
  getQuizById,
  listAdminQuizzes,
  updateAdminQuiz,
} from '@/services/quizzes.service'
import type { AdminQuizListParams, AdminQuizMutationPayload, Quiz } from '@/types/quiz.types'

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

export const useAdminQuizzes = () => {
  const [listState, setListState] = useState<QuizListState>(EMPTY_LIST_STATE)
  const [detailState, setDetailState] = useState<QuizDetailState>(EMPTY_DETAIL_STATE)
  const [paginationState, setPaginationState] = useState<QuizPagination>(EMPTY_PAGINATION)
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
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.loadFailed'),
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
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.detailLoadFailed'),
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
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.createFailed'))
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
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.updateFailed'))
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
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.deleteFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadList])

  return {
    listState,
    detailState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadList,
    loadPage,
    loadDetail,
    submitCreate,
    submitUpdate,
    submitDelete,
  }
}
