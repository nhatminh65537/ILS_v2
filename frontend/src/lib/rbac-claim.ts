import type {
  PermissionDto,
  RbacRoleCapabilities,
  SystemConfigCapabilities,
  RbacUserRoleCapabilities,
} from '@/types/rbac.types'

type JwtPayload = {
  permissions?: string
}

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + padLength, '=')
  return atob(padded)
}

const decodeJwtPayload = (accessToken: string | null | undefined): JwtPayload | null => {
  if (!accessToken) {
    return null
  }

  const chunks = accessToken.split('.')
  if (chunks.length < 2) {
    return null
  }

  try {
    const payloadString = decodeBase64Url(chunks[1])
    return JSON.parse(payloadString) as JwtPayload
  } catch {
    return null
  }
}

export const decodePermissionBitmap = (bitmapBase64: string): Set<number> => {
  const grantedIds = new Set<number>()

  if (!bitmapBase64) {
    return grantedIds
  }

  try {
    const decoded = atob(bitmapBase64)

    for (let byteIndex = 0; byteIndex < decoded.length; byteIndex += 1) {
      const byteValue = decoded.charCodeAt(byteIndex)

      for (let bitOffset = 0; bitOffset < 8; bitOffset += 1) {
        if (((byteValue >> bitOffset) & 1) === 1) {
          grantedIds.add(byteIndex * 8 + bitOffset)
        }
      }
    }
  } catch {
    return new Set<number>()
  }

  return grantedIds
}

const getGrantedIds = (accessToken: string | null | undefined): Set<number> => {
  const payload = decodeJwtPayload(accessToken)
  return decodePermissionBitmap(payload?.permissions ?? '')
}

const resolvePermissionId = (
  permissionsCatalog: readonly PermissionDto[],
  permissionKey: string
): number | null => {
  const matched = permissionsCatalog.find((permission) => permission.name === permissionKey)
  return matched ? matched.id : null
}

export const hasPermissionKey = (
  accessToken: string | null | undefined,
  permissionsCatalog: readonly PermissionDto[],
  permissionKey: string
): boolean => {
  const permissionId = resolvePermissionId(permissionsCatalog, permissionKey)
  if (permissionId === null) {
    return false
  }

  const grantedIds = getGrantedIds(accessToken)
  return grantedIds.has(permissionId)
}

export const canManageRoles = (
  accessToken: string | null | undefined,
  permissionsCatalog: readonly PermissionDto[]
): RbacRoleCapabilities => {
  return {
    canListRoles: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.list'),
    canCreateRole: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.create'),
    canUpdateRole: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.partial_update'),
    canDeleteRole: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.destroy'),
    canAssignRolePermission: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.permissions'),
    canRevokeRolePermission: hasPermissionKey(accessToken, permissionsCatalog, 'api.role.revoke_permission'),
  }
}

export const canManageUserRoles = (
  accessToken: string | null | undefined,
  permissionsCatalog: readonly PermissionDto[]
): RbacUserRoleCapabilities => {
  return {
    canListUserRoles: hasPermissionKey(accessToken, permissionsCatalog, 'api.user_role.list'),
    canAssignUserRole: hasPermissionKey(accessToken, permissionsCatalog, 'api.user_role.create'),
    canRevokeUserRole: hasPermissionKey(accessToken, permissionsCatalog, 'api.user_role.destroy'),
  }
}

export const canManageSystemConfig = (
  accessToken: string | null | undefined,
  permissionsCatalog: readonly PermissionDto[]
): SystemConfigCapabilities => {
  const canUpdate =
    hasPermissionKey(accessToken, permissionsCatalog, 'api.system_config.partial_update') ||
    hasPermissionKey(accessToken, permissionsCatalog, 'api.system_config.update')

  return {
    canList: hasPermissionKey(accessToken, permissionsCatalog, 'api.system_config.list'),
    canRetrieve: hasPermissionKey(accessToken, permissionsCatalog, 'api.system_config.retrieve'),
    canUpdate,
    canViewSecret: hasPermissionKey(accessToken, permissionsCatalog, 'system.config.view_secret'),
  }
}
