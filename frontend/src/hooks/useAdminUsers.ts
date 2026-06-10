'use client'

import { useCallback, useState } from 'react'
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from '@/services/users.service'
import { extractAdminUserErrorText } from '@/lib/admin-user-error-map'
import type {
  AdminUserCreatePayload,
  AdminUserDto,
  AdminUserListParams,
  AdminUserUpdatePayload,
} from '@/types/user.types'

const PAGE_SIZE = 20

interface AdminUsersListState {
  data: AdminUserDto[]
  isLoading: boolean
  errorMessageKey: string | null
}

interface AdminUsersPagination {
  count: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

const EMPTY_LIST_STATE: AdminUsersListState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_PAGINATION: AdminUsersPagination = {
  count: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  hasNext: false,
  hasPrevious: false,
}

export const useAdminUsers = () => {
  const [usersState, setUsersState] = useState<AdminUsersListState>(EMPTY_LIST_STATE)
  const [pagination, setPagination] = useState<AdminUsersPagination>(EMPTY_PAGINATION)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)
  // Exact server-provided message (e.g. "This password is too common.") shown
  // verbatim when present; falls back to the translated mutationErrorKey.
  const [mutationErrorText, setMutationErrorText] = useState<string | null>(null)
  // Persisted filter params so re-fetches after mutations use same filters
  const [activeParams, setActiveParams] = useState<AdminUserListParams>({})

  const loadUsers = useCallback(async (params?: AdminUserListParams) => {
    const mergedParams: AdminUserListParams = { ...params, limit: PAGE_SIZE }
    setActiveParams(mergedParams)
    setUsersState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))
    try {
      const result = await listAdminUsers(mergedParams)
      const page = mergedParams.offset ? Math.floor(mergedParams.offset / PAGE_SIZE) + 1 : 1
      setUsersState({ data: [...result.results], isLoading: false, errorMessageKey: null })
      setPagination({
        count: result.count,
        page,
        pageSize: PAGE_SIZE,
        hasNext: result.next !== null,
        hasPrevious: result.previous !== null,
      })
    } catch {
      setUsersState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: 'errors.loadFailed',
      }))
    }
  }, [])

  const loadPage = useCallback(
    async (page: number) => {
      const offset = (page - 1) * PAGE_SIZE
      await loadUsers({ ...activeParams, offset })
    },
    [activeParams, loadUsers]
  )

  const submitToggleActive = useCallback(
    async (user: AdminUserDto): Promise<boolean> => {
      setIsMutating(true)
      setMutationErrorKey(null)
      setMutationErrorText(null)
      try {
        const payload: AdminUserUpdatePayload = { is_active: !user.is_active }
        await updateAdminUser(user.id, payload)
        // Refresh list in-place with same filters
        await loadUsers({ ...activeParams })
        return true
      } catch {
        setMutationErrorKey('errors.toggleFailed')
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [activeParams, loadUsers]
  )

  const submitCreateUser = useCallback(
    async (payload: AdminUserCreatePayload): Promise<boolean> => {
      setIsMutating(true)
      setMutationErrorKey(null)
      setMutationErrorText(null)
      try {
        await createAdminUser(payload)
        await loadUsers({ ...activeParams })
        return true
      } catch (error) {
        // Surface the exact server reason (weak/duplicate password, taken
        // username/email, …) so the admin knows why the 400 happened.
        const text = extractAdminUserErrorText(error)
        if (text) {
          setMutationErrorText(text)
        } else {
          setMutationErrorKey('errors.createFailed')
        }
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [activeParams, loadUsers]
  )

  return {
    usersState,
    pagination,
    isMutating,
    mutationErrorKey,
    mutationErrorText,
    loadUsers,
    loadPage,
    submitToggleActive,
    submitCreateUser,
  }
}
