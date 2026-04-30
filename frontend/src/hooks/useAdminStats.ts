'use client'

import { useCallback, useState } from 'react'
import { listAdminUsers } from '@/services/users.service'
import { getAdminStatsOverview, getAdminStatsUserDetail } from '@/services/admin-stats.service'
import type { AdminStatsOverviewDto, AdminStatsUserDetailDto } from '@/types/admin-stats.types'

interface OverviewState {
  data: AdminStatsOverviewDto | null
  isLoading: boolean
  errorMessageKey: string | null
}

interface UserDetailState {
  data: AdminStatsUserDetailDto | null
  isLoading: boolean
  errorMessageKey: string | null
}

export const useAdminStats = () => {
  const [overviewState, setOverviewState] = useState<OverviewState>({
    data: null,
    isLoading: false,
    errorMessageKey: null,
  })
  const [userDetailState, setUserDetailState] = useState<UserDetailState>({
    data: null,
    isLoading: false,
    errorMessageKey: null,
  })
  const [searchQuery, setSearchQuery] = useState('')

  const loadOverview = useCallback(async () => {
    setOverviewState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))
    try {
      const data = await getAdminStatsOverview()
      setOverviewState({ data, isLoading: false, errorMessageKey: null })
    } catch {
      setOverviewState({ data: null, isLoading: false, errorMessageKey: 'errors.loadFailed' })
    }
  }, [])

  const searchUser = useCallback(async (username: string) => {
    if (!username.trim()) return
    setUserDetailState({ data: null, isLoading: true, errorMessageKey: null })
    try {
      const listResult = await listAdminUsers({ search: username.trim(), limit: 1 })
      if (listResult.count === 0 || listResult.results.length === 0) {
        setUserDetailState({ data: null, isLoading: false, errorMessageKey: 'errors.userNotFound' })
        return
      }
      const userId = listResult.results[0].id
      const detail = await getAdminStatsUserDetail(userId)
      setUserDetailState({ data: detail, isLoading: false, errorMessageKey: null })
    } catch {
      setUserDetailState({ data: null, isLoading: false, errorMessageKey: 'errors.loadFailed' })
    }
  }, [])

  return {
    overviewState,
    userDetailState,
    searchQuery,
    setSearchQuery,
    loadOverview,
    searchUser,
  }
}
