'use client'

import axios from 'axios'
import { useCallback, useRef, useState } from 'react'
import {
  broadcastAdminNotification,
  listAdminBroadcastHistory,
} from '@/services/notifications.service'
import type {
  AdminBroadcastHistoryItem,
  BroadcastNotificationPayload,
  BroadcastNotificationResponse,
} from '@/types/notification.types'

const PAGE_SIZE = 20

interface AdminNotificationsListState {
  data: AdminBroadcastHistoryItem[]
  isLoading: boolean
  errorMessageKey: string | null
}

interface AdminNotificationsPagination {
  count: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

const EMPTY_LIST_STATE: AdminNotificationsListState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_PAGINATION: AdminNotificationsPagination = {
  count: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  hasNext: false,
  hasPrevious: false,
}

const mapAdminNotificationErrorToMessageKey = (
  error: unknown,
  fallback = 'errors.submitFailed'
): string => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  if (status === 401) {
    return 'errors.unauthenticated'
  }
  if (status === 403) {
    return 'errors.forbidden'
  }
  if (status === 400) {
    return 'errors.validationFailed'
  }

  return fallback
}

export const useAdminNotifications = () => {
  const [listState, setListState] = useState<AdminNotificationsListState>(EMPTY_LIST_STATE)
  const [pagination, setPagination] = useState<AdminNotificationsPagination>(EMPTY_PAGINATION)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)
  const [lastSubmitResult, setLastSubmitResult] = useState<BroadcastNotificationResponse | null>(null)

  const activeParamsRef = useRef<{ limit?: number; offset?: number }>({ limit: PAGE_SIZE, offset: 0 })

  const loadHistory = useCallback(async (params?: { limit?: number; offset?: number }) => {
    const mergedParams = {
      ...activeParamsRef.current,
      ...(params ?? {}),
      limit: params?.limit ?? activeParamsRef.current.limit ?? PAGE_SIZE,
    }

    activeParamsRef.current = mergedParams
    setListState((state) => ({ ...state, isLoading: true, errorMessageKey: null }))

    try {
      const result = await listAdminBroadcastHistory(mergedParams)
      const page = mergedParams.offset ? Math.floor(mergedParams.offset / PAGE_SIZE) + 1 : 1

      setListState({
        data: [...result.results],
        isLoading: false,
        errorMessageKey: null,
      })
      setPagination({
        count: result.count,
        page,
        pageSize: PAGE_SIZE,
        hasNext: result.next !== null,
        hasPrevious: result.previous !== null,
      })
    } catch (error) {
      setListState((state) => ({
        ...state,
        isLoading: false,
        errorMessageKey: mapAdminNotificationErrorToMessageKey(
          error,
          'errors.historyLoadFailed'
        ),
      }))
    }
  }, [])

  const loadPage = useCallback(
    async (page: number) => {
      const offset = (Math.max(page, 1) - 1) * PAGE_SIZE
      await loadHistory({ ...activeParamsRef.current, offset })
    },
    [loadHistory]
  )

  const submitBroadcast = useCallback(
    async (payload: BroadcastNotificationPayload): Promise<BroadcastNotificationResponse | null> => {
      setIsSubmitting(true)
      setMutationErrorKey(null)

      try {
        const result = await broadcastAdminNotification(payload)
        setLastSubmitResult(result)
        await loadHistory({ ...activeParamsRef.current, offset: 0 })
        return result
      } catch (error) {
        setMutationErrorKey(mapAdminNotificationErrorToMessageKey(error))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [loadHistory]
  )

  const resetMutationState = useCallback(() => {
    setMutationErrorKey(null)
    setLastSubmitResult(null)
  }, [])

  return {
    listState,
    pagination,
    isSubmitting,
    mutationErrorKey,
    lastSubmitResult,
    loadHistory,
    loadPage,
    submitBroadcast,
    resetMutationState,
  }
}
