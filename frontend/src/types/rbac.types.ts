export interface PermissionDto {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly is_active: boolean
}

export interface RoleDto {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly is_system: boolean
  readonly permissions: readonly PermissionDto[]
}

export interface UserRoleMappingDto {
  readonly id: number
  readonly user: number
  readonly role: number
  readonly role_name: string
  readonly created_at: string
}

export interface RoleUpsertPayload {
  name: string
  description?: string
}

export interface RolePermissionAssignPayload {
  permission_id: number
}

export interface UserRoleAssignPayload {
  role_id: number
}

export interface ActionResult {
  success: boolean
  messageKey?: string
}

export interface RbacListState<T> {
  data: readonly T[]
  isLoading: boolean
  errorMessageKey: string | null
}

export interface RbacRoleCapabilities {
  canListRoles: boolean
  canCreateRole: boolean
  canUpdateRole: boolean
  canDeleteRole: boolean
  canAssignRolePermission: boolean
  canRevokeRolePermission: boolean
}

export interface RbacUserRoleCapabilities {
  canListUserRoles: boolean
  canAssignUserRole: boolean
  canRevokeUserRole: boolean
}

export interface SystemConfigCapabilities {
  canList: boolean
  canRetrieve: boolean
  canUpdate: boolean
  canViewSecret: boolean
}
