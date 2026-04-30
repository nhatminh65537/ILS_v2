'use client'

import { useCallback, useState } from 'react'
import { getAdminStatsOverview } from '@/services/admin-stats.service'
import type { AdminStatsOverviewDto } from '@/types/admin-stats.types'

interface DashboardState {
  data: AdminStatsOverviewDto | null
  isLoading: boolean
  errorMessageKey: string | null
}

export const useAdminDashboard = () => {
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: false,
    errorMessageKey: null,
  })

  const loadDashboard = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))
    try {
      const data = await getAdminStatsOverview()
      setState({ data, isLoading: false, errorMessageKey: null })
    } catch {
      setState({ data: null, isLoading: false, errorMessageKey: 'errors.loadFailed' })
    }
  }, [])

  return { state, loadDashboard }
}
