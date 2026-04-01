import apiClient from '@/lib/axios'
import type {
  SystemConfigDto,
  SystemConfigGroupedMap,
  UpdateConfigPayload,
} from '@/types/admin.types'

const encodeConfigKey = (key: string): string => encodeURIComponent(key)

export const listSystemConfigs = async (): Promise<SystemConfigGroupedMap> => {
  const response = await apiClient.get('/api/admin/config/')
  return response.data as SystemConfigGroupedMap
}

export const getSystemConfigByKey = async (key: string): Promise<SystemConfigDto> => {
  const response = await apiClient.get(`/api/admin/config/${encodeConfigKey(key)}/`)
  return response.data as SystemConfigDto
}

export const updateSystemConfigValue = async (
  key: string,
  payload: UpdateConfigPayload
): Promise<SystemConfigDto> => {
  const response = await apiClient.patch(`/api/admin/config/${encodeConfigKey(key)}/`, payload)
  return response.data as SystemConfigDto
}
