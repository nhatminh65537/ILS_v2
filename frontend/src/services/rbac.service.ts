import apiClient from '@/lib/axios'
import type {
  PermissionDto,
  RoleDto,
  RolePermissionAssignPayload,
  RoleUpsertPayload,
  UserRoleAssignPayload,
  UserRoleMappingDto,
} from '@/types/rbac.types'

export const listPermissions = async (includeInactive = false): Promise<readonly PermissionDto[]> => {
  const response = await apiClient.get('/api/admin/permissions/', {
    params: includeInactive ? { include_inactive: true } : undefined,
  })
  return response.data
}

export const listRoles = async (): Promise<readonly RoleDto[]> => {
  const response = await apiClient.get('/api/admin/roles/')
  return response.data
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
  return response.data
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
  return response.data
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
