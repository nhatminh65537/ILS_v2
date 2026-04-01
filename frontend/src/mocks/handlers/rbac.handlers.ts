import { http, HttpResponse } from 'msw'
import { usersFixture } from '@/mocks/data/fixtures'
import {
  hasPermission,
  permissionFixtures,
  parsePermissionIdsFromAccessToken,
} from '@/mocks/handlers/admin-permissions'
import { badRequest, notFound, parseNumericId } from '@/mocks/handlers/shared'
import type { PermissionDto, RoleDto, UserRoleMappingDto } from '@/types/rbac.types'

type RoleRecord = {
  id: number
  name: string
  description: string
  is_system: boolean
  permission_ids: number[]
}

type UserRoleRecord = {
  id: number
  user: number
  role: number
  created_at: string
}

const now = '2026-04-01T00:00:00.000Z'

const resolveAccessToken = (request: Request): string | null => {
  const raw = request.headers.get('Authorization')
  if (!raw || !raw.startsWith('Bearer ')) {
    return null
  }
  return raw.slice('Bearer '.length)
}

const unauthorized = () => HttpResponse.json({ detail: 'Authentication credentials were not provided.' }, { status: 401 })

const forbidden = () => HttpResponse.json({ detail: 'Permission denied.' }, { status: 403 })

const requirePermission = (
  request: Request,
  permissionName: string
): { ok: true; accessToken: string } | { ok: false; response: Response } => {
  const accessToken = resolveAccessToken(request)
  if (!accessToken) {
    return { ok: false, response: unauthorized() }
  }

  if (!hasPermission(accessToken, permissionName)) {
    return { ok: false, response: forbidden() }
  }

  return { ok: true, accessToken }
}

const permissionById = new Map(permissionFixtures.map((item) => [item.id, item]))

const createRoleRecord = (
  id: number,
  name: string,
  description: string,
  isSystem: boolean,
  permissionNames: readonly string[]
): RoleRecord => ({
  id,
  name,
  description,
  is_system: isSystem,
  permission_ids: permissionFixtures
    .filter((permission) => permissionNames.includes(permission.name))
    .map((permission) => permission.id),
})

const roles: RoleRecord[] = [
  createRoleRecord(
    1,
    'Admin',
    'System administrator with full RBAC and config capabilities',
    true,
    permissionFixtures.map((permission) => permission.name)
  ),
  createRoleRecord(
    2,
    'Editor',
    'Can view admin data but cannot mutate role/config ownership',
    true,
    [
      'api.permission.list',
      'api.role.list',
      'api.role.retrieve',
      'api.user_role.list',
      'api.system_config.list',
      'api.system_config.retrieve',
    ]
  ),
  createRoleRecord(3, 'Member', 'Default member role', true, []),
]

const userRoles: UserRoleRecord[] = usersFixture.map((user, index) => {
  let roleId = 3
  if (user.is_superuser) {
    roleId = 1
  } else if (user.is_staff) {
    roleId = 2
  }

  return {
    id: index + 1,
    user: user.id,
    role: roleId,
    created_at: now,
  }
})

const serializeRole = (role: RoleRecord): RoleDto => ({
  id: role.id,
  name: role.name,
  description: role.description,
  is_system: role.is_system,
  permissions: role.permission_ids
    .map((permissionId) => permissionById.get(permissionId))
    .filter((permission): permission is PermissionDto => Boolean(permission)),
})

const serializeUserRole = (record: UserRoleRecord): UserRoleMappingDto => {
  const role = roles.find((item) => item.id === record.role)
  return {
    id: record.id,
    user: record.user,
    role: record.role,
    role_name: role?.name ?? 'Unknown',
    created_at: record.created_at,
  }
}

const ensureUserExists = (userId: number): boolean => usersFixture.some((item) => item.id === userId)

export const rbacHandlers = [
  http.get('*/api/admin/permissions/', ({ request }) => {
    const auth = requirePermission(request, 'api.permission.list')
    if (!auth.ok) {
      return auth.response
    }

    const includeInactive = new URL(request.url).searchParams.get('include_inactive') === 'true'
    const payload = includeInactive ? permissionFixtures : permissionFixtures.filter((item) => item.is_active)
    return HttpResponse.json(payload)
  }),

  http.get('*/api/admin/roles/', ({ request }) => {
    const auth = requirePermission(request, 'api.role.list')
    if (!auth.ok) {
      return auth.response
    }

    return HttpResponse.json(roles.map(serializeRole))
  }),

  http.post('*/api/admin/roles/', async ({ request }) => {
    const auth = requirePermission(request, 'api.role.create')
    if (!auth.ok) {
      return auth.response
    }

    const payload = (await request.json()) as { name?: string; description?: string }
    const name = payload.name?.trim() ?? ''

    if (!name) {
      return badRequest('name is required')
    }

    const duplicate = roles.some((item) => item.name.toLowerCase() === name.toLowerCase())
    if (duplicate) {
      return badRequest('Role name already exists')
    }

    const nextRole: RoleRecord = {
      id: roles.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      name,
      description: payload.description?.trim() ?? '',
      is_system: false,
      permission_ids: [],
    }

    roles.push(nextRole)
    return HttpResponse.json(serializeRole(nextRole), { status: 201 })
  }),

  http.get('*/api/admin/roles/:id/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.retrieve')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    if (!roleId || roleId <= 0) {
      return notFound('Role not found')
    }

    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return notFound('Role not found')
    }

    return HttpResponse.json(serializeRole(role))
  }),

  http.patch('*/api/admin/roles/:id/', async ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.partial_update')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    if (!roleId || roleId <= 0) {
      return notFound('Role not found')
    }

    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return notFound('Role not found')
    }

    const payload = (await request.json()) as { name?: string; description?: string }
    if (payload.name) {
      const requestedName = payload.name.trim()

      if (role.is_system && requestedName !== role.name) {
        return HttpResponse.json({ detail: 'System roles cannot be renamed' }, { status: 403 })
      }

      const duplicate = roles.some(
        (item) => item.id !== role.id && item.name.toLowerCase() === requestedName.toLowerCase()
      )
      if (duplicate) {
        return badRequest('Role name already exists')
      }

      role.name = requestedName
    }

    if (typeof payload.description === 'string') {
      role.description = payload.description
    }

    return HttpResponse.json(serializeRole(role))
  }),

  http.delete('*/api/admin/roles/:id/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.destroy')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    if (!roleId || roleId <= 0) {
      return notFound('Role not found')
    }

    const roleIndex = roles.findIndex((item) => item.id === roleId)
    if (roleIndex < 0) {
      return notFound('Role not found')
    }

    if (roles[roleIndex].is_system) {
      return HttpResponse.json({ detail: 'System roles cannot be deleted' }, { status: 403 })
    }

    roles.splice(roleIndex, 1)
    for (let index = userRoles.length - 1; index >= 0; index -= 1) {
      if (userRoles[index].role === roleId) {
        userRoles.splice(index, 1)
      }
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/admin/roles/:id/permissions/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.permissions')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    if (!roleId || roleId <= 0) {
      return notFound('Role not found')
    }

    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return notFound('Role not found')
    }

    const assignedPermissions = role.permission_ids
      .map((permissionId) => permissionById.get(permissionId))
      .filter((permission): permission is PermissionDto => Boolean(permission))

    return HttpResponse.json(assignedPermissions)
  }),

  http.post('*/api/admin/roles/:id/permissions/', async ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.permissions')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    if (!roleId || roleId <= 0) {
      return notFound('Role not found')
    }

    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return notFound('Role not found')
    }

    const payload = (await request.json()) as { permission_id?: number }
    if (!payload.permission_id || !permissionById.has(payload.permission_id)) {
      return badRequest('Permission not found or inactive')
    }

    if (!role.permission_ids.includes(payload.permission_id)) {
      role.permission_ids.push(payload.permission_id)
    }

    return HttpResponse.json({ detail: 'Permission assigned' }, { status: 201 })
  }),

  http.delete('*/api/admin/roles/:id/permissions/:permId/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.role.revoke_permission')
    if (!auth.ok) {
      return auth.response
    }

    const roleId = parseNumericId(String(params.id))
    const permissionId = parseNumericId(String(params.permId))

    if (!roleId || roleId <= 0 || !permissionId || permissionId <= 0) {
      return notFound('Role or permission not found')
    }

    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return notFound('Role not found')
    }

    if (!role.permission_ids.includes(permissionId)) {
      return notFound('Permission not assigned to this role')
    }

    role.permission_ids = role.permission_ids.filter((item) => item !== permissionId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/users/:id/roles/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.user_role.list')
    if (!auth.ok) {
      return auth.response
    }

    const userId = parseNumericId(String(params.id))
    if (!userId || userId <= 0 || !ensureUserExists(userId)) {
      return notFound('Not found')
    }

    const mapped = userRoles
      .filter((item) => item.user === userId)
      .map(serializeUserRole)

    return HttpResponse.json(mapped)
  }),

  http.post('*/api/users/:id/roles/', async ({ request, params }) => {
    const auth = requirePermission(request, 'api.user_role.create')
    if (!auth.ok) {
      return auth.response
    }

    const userId = parseNumericId(String(params.id))
    if (!userId || userId <= 0 || !ensureUserExists(userId)) {
      return notFound('Not found')
    }

    const payload = (await request.json()) as { role_id?: number }
    const roleId = payload.role_id
    if (!roleId || !roles.some((item) => item.id === roleId)) {
      return badRequest('Role not found')
    }

    const existing = userRoles.find((item) => item.user === userId && item.role === roleId)
    if (existing) {
      return HttpResponse.json(serializeUserRole(existing))
    }

    const next: UserRoleRecord = {
      id: userRoles.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      user: userId,
      role: roleId,
      created_at: now,
    }

    userRoles.push(next)
    return HttpResponse.json(serializeUserRole(next), { status: 201 })
  }),

  http.delete('*/api/users/:id/roles/:roleId/', ({ request, params }) => {
    const auth = requirePermission(request, 'api.user_role.destroy')
    if (!auth.ok) {
      return auth.response
    }

    const userId = parseNumericId(String(params.id))
    const roleId = parseNumericId(String(params.roleId))
    if (!userId || !roleId || !ensureUserExists(userId)) {
      return notFound('Not found')
    }

    const index = userRoles.findIndex((item) => item.user === userId && item.role === roleId)
    if (index < 0) {
      return notFound('User does not have this role')
    }

    userRoles.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Utility endpoint for debugging permissions during local frontend testing.
  http.get('*/api/mock/debug/permissions/', ({ request }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    const granted = parsePermissionIdsFromAccessToken(accessToken)
    return HttpResponse.json({ granted_permission_ids: [...granted].sort((a, b) => a - b) })
  }),
]
