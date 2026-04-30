import apiClient from '@/lib/axios'
import type { AdminStatsOverviewDto, AdminStatsUserDetailDto } from '@/types/admin-stats.types'

export const getAdminStatsOverview = async (): Promise<AdminStatsOverviewDto> => {
  const response = await apiClient.get('/api/admin/stats/')
  return response.data
}

export const getAdminStatsUserDetail = async (userId: number): Promise<AdminStatsUserDetailDto> => {
  const response = await apiClient.get(`/api/admin/stats/users/${userId}/`)
  return response.data
}
