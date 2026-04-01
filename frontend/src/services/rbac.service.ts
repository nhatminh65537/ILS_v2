import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  PermissionDto,
  RoleDto,
  RolePermissionAssignPayload,
  RoleUpsertPayload,
  UserRoleAssignPayload,
  UserRoleMappingDto,
} from '@/types/rbac.types'

type PaginatedOrList<T> = readonly T[] | PaginatedResponse<T>

type PermissionPageResult = {
  data: readonly PermissionDto[]
  count: number
  next: string | null
  previous: string | null
  page: number
}

const normalizeListResponse = <T>(data: PaginatedOrList<T>): readonly T[] => {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
    return data.results
  }

  return []
}

const normalizePaginatedResponse = <T>(data: PaginatedOrList<T>): PaginatedResponse<T> => {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    }
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
    return {
      count: Number.isFinite(data.count) ? data.count : data.results.length,
      next: typeof data.next === 'string' || data.next === null ? data.next : null,
      previous: typeof data.previous === 'string' || data.previous === null ? data.previous : null,
      results: data.results,
    }
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  }
}

export const listPermissionsPage = async (options?: {
  includeInactive?: boolean
  page?: number
}): Promise<PermissionPageResult> => {
  const includeInactive = options?.includeInactive ?? false
  const page = options?.page ?? 1

  const response = await apiClient.get('/api/admin/permissions/', {
    params: {
      ...(includeInactive ? { include_inactive: true } : {}),
      page,
    },
  })

  const normalized = normalizePaginatedResponse<PermissionDto>(response.data)

  return {
    data: normalized.results,
    count: normalized.count,
    next: normalized.next,
    previous: normalized.previous,
    page,
  }
}

export const listPermissions = async (includeInactive = false): Promise<readonly PermissionDto[]> => {
  const firstPage = await listPermissionsPage({ includeInactive, page: 1 })
  if (!firstPage.next) {
    return firstPage.data
  }

  const allPermissions: PermissionDto[] = [...firstPage.data]
  let page = 2
  let hasNext = true
  let safetyCounter = 0

  while (hasNext && safetyCounter < 64) {
    const currentPage = await listPermissionsPage({ includeInactive, page })
    allPermissions.push(...currentPage.data)
    hasNext = Boolean(currentPage.next)
    page += 1
    safetyCounter += 1
  }

  return allPermissions
}

export const listRoles = async (): Promise<readonly RoleDto[]> => {
  const response = await apiClient.get('/api/admin/roles/')
  return normalizeListResponse<RoleDto>(response.data)
}

export const getRoleById = async (id: number): Promise<RoleDto> => {
  const response = await apiClient.get(`/api/admin/roles/${id}/`)
  return response.data
}

export const createRole = async (payload: RoleUpsertPayload): Promise<RoleDto> => {
  const response = await apiClient.post('/api/admin/roles/', payload)
  return response.data
}

export const updateRole = async (id: number, payload: RoleUpsertPayload): Promise<RoleDto> => {
  const response = await apiClient.patch(`/api/admin/roles/${id}/`, payload)
  return response.data
}

export const deleteRole = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/admin/roles/${id}/`)
}

export const getRolePermissions = async (roleId: number): Promise<readonly PermissionDto[]> => {
  const response = await apiClient.get(`/api/admin/roles/${roleId}/permissions/`)
  return normalizeListResponse<PermissionDto>(response.data)
}

export const assignPermissionToRole = async (
  roleId: number,
  payload: RolePermissionAssignPayload
): Promise<{ detail: string }> => {
  const response = await apiClient.post(`/api/admin/roles/${roleId}/permissions/`, payload)
  return response.data
}

export const revokePermissionFromRole = async (roleId: number, permissionId: number): Promise<void> => {
  await apiClient.delete(`/api/admin/roles/${roleId}/permissions/${permissionId}/`)
}

export const getUserRoles = async (userId: number): Promise<readonly UserRoleMappingDto[]> => {
  const response = await apiClient.get(`/api/users/${userId}/roles/`)
  return normalizeListResponse<UserRoleMappingDto>(response.data)
}

export const assignRoleToUser = async (
  userId: number,
  payload: UserRoleAssignPayload
): Promise<UserRoleMappingDto> => {
  const response = await apiClient.post(`/api/users/${userId}/roles/`, payload)
  return response.data
}

export const revokeRoleFromUser = async (userId: number, roleId: number): Promise<void> => {
  await apiClient.delete(`/api/users/${userId}/roles/${roleId}/`)
}
