import type { PermissionDto } from '@/types/rbac.types'

export const permissionFixtures: PermissionDto[] = [
  { id: 1, name: 'api.permission.list', description: 'List permissions', is_active: true },
  { id: 2, name: 'api.permission.retrieve', description: 'Retrieve permission detail', is_active: true },
  { id: 3, name: 'api.role.list', description: 'List roles', is_active: true },
  { id: 4, name: 'api.role.retrieve', description: 'Retrieve role detail', is_active: true },
  { id: 5, name: 'api.role.create', description: 'Create role', is_active: true },
  { id: 6, name: 'api.role.update', description: 'Update role', is_active: true },
  { id: 7, name: 'api.role.partial_update', description: 'Partial update role', is_active: true },
  { id: 8, name: 'api.role.destroy', description: 'Delete role', is_active: true },
  { id: 9, name: 'api.role.permissions', description: 'Assign role permissions', is_active: true },
  { id: 10, name: 'api.role.revoke_permission', description: 'Revoke role permissions', is_active: true },
  { id: 11, name: 'api.user_role.list', description: 'List user roles', is_active: true },
  { id: 12, name: 'api.user_role.create', description: 'Assign user role', is_active: true },
  { id: 13, name: 'api.user_role.destroy', description: 'Revoke user role', is_active: true },
  { id: 14, name: 'api.system_config.list', description: 'List system configs', is_active: true },
  { id: 15, name: 'api.system_config.retrieve', description: 'Retrieve system config detail', is_active: true },
  { id: 16, name: 'api.system_config.update', description: 'Update system config', is_active: true },
  { id: 17, name: 'api.system_config.partial_update', description: 'Partial update system config', is_active: true },
  { id: 18, name: 'system.config.view_secret', description: 'View clear secret config values', is_active: true },
  { id: 19, name: 'api.quiz.list', description: 'List quizzes', is_active: true },
  { id: 20, name: 'api.quiz.create', description: 'Create quiz', is_active: true },
  { id: 21, name: 'api.quiz.partial_update', description: 'Update quiz metadata', is_active: true },
  { id: 22, name: 'api.quiz.destroy', description: 'Delete quiz', is_active: true },
  { id: 23, name: 'api.quiz.questions', description: 'Manage quiz questions', is_active: true },
  { id: 24, name: 'api.quiz.question_detail', description: 'Edit quiz question detail', is_active: true },
]

const permissionIdByName = new Map(permissionFixtures.map((item) => [item.name, item.id]))

const encodeBase64Url = (value: string): string =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  return atob(normalized.padEnd(normalized.length + padLength, '='))
}

const encodePermissionBitmap = (permissionIds: readonly number[]): string => {
  if (permissionIds.length === 0) {
    return ''
  }

  const highestId = Math.max(...permissionIds)
  const byteLength = Math.floor(highestId / 8) + 1
  const bytes = new Uint8Array(byteLength)

  for (const permissionId of permissionIds) {
    const byteIndex = Math.floor(permissionId / 8)
    const bitOffset = permissionId % 8
    bytes[byteIndex] |= 1 << bitOffset
  }

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
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

export const getPermissionIdsByNames = (names: readonly string[]): number[] =>
  names
    .map((name) => permissionIdByName.get(name))
    .filter((value): value is number => Number.isInteger(value))

export const buildMockAccessToken = (userId: number, permissionIds: readonly number[]): string => {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const adminSurface = permissionIds.length > 0
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: String(userId),
      permissions: encodePermissionBitmap(permissionIds),
      pv: 1,
      admin_surface: adminSurface,
    })
  )
  return `${header}.${payload}.mock-signature`
}

export const buildMockRefreshToken = (userId: number): string =>
  `refresh.${userId}.${Math.random().toString(36).slice(2)}`

export const parseUserIdFromRefreshToken = (refreshToken: string | undefined): number | null => {
  if (!refreshToken) {
    return null
  }

  const segments = refreshToken.split('.')
  if (segments.length < 2) {
    return null
  }

  const userId = Number(segments[1])
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

export const parsePermissionIdsFromAccessToken = (accessToken: string | null): Set<number> => {
  if (!accessToken) {
    return new Set<number>()
  }

  const segments = accessToken.split('.')
  if (segments.length < 2) {
    return new Set<number>()
  }

  try {
    const payload = JSON.parse(decodeBase64Url(segments[1])) as { permissions?: string }
    return decodePermissionBitmap(payload.permissions ?? '')
  } catch {
    return new Set<number>()
  }
}

export const hasPermission = (accessToken: string | null, permissionName: string): boolean => {
  const permissionId = permissionIdByName.get(permissionName)
  if (!permissionId) {
    return false
  }

  const grantedIds = parsePermissionIdsFromAccessToken(accessToken)
  return grantedIds.has(permissionId)
}
