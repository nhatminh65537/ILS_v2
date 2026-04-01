import { http, HttpResponse } from 'msw'
import { usersFixture } from '@/mocks/data/fixtures'
import {
  buildMockAccessToken,
  buildMockRefreshToken,
  getPermissionIdsByNames,
  parseUserIdFromRefreshToken,
  permissionFixtures,
} from '@/mocks/handlers/admin-permissions'
import { badRequest } from '@/mocks/handlers/shared'

const ssoRedirectUrl = 'https://authentik.local/application/o/authorize/?client_id=ils&mock=true'

const STAFF_PERMISSION_IDS = getPermissionIdsByNames([
  'api.permission.list',
  'api.role.list',
  'api.role.retrieve',
  'api.user_role.list',
  'api.system_config.list',
  'api.system_config.retrieve',
])

const resolvePermissionIdsForUser = (user: { is_superuser?: boolean; is_staff?: boolean }): number[] => {
  if (user.is_superuser) {
    return permissionFixtures.map((permission) => permission.id)
  }

  if (user.is_staff) {
    return STAFF_PERMISSION_IDS
  }

  return []
}

const issueAuthTokens = (user: {
  id: number
  is_superuser?: boolean
  is_staff?: boolean
}): { access: string; refresh: string } => {
  const permissionIds = resolvePermissionIdsForUser(user)
  return {
    access: buildMockAccessToken(user.id, permissionIds),
    refresh: buildMockRefreshToken(user.id),
  }
}

const toAuthUser = (user: { id: number; username: string; email: string }) => ({
  id: user.id,
  username: user.username,
  email: user.email,
})

const resolveAccessToken = (request: Request): string | null => {
  const raw = request.headers.get('Authorization')
  if (!raw || !raw.startsWith('Bearer ')) {
    return null
  }
  return raw.slice('Bearer '.length)
}

const unauthorized = () =>
  HttpResponse.json({ detail: 'Authentication credentials were not provided.' }, { status: 401 })

export const authHandlers = [
  http.post('*/api/auth/register/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; email?: string; password?: string }

    if (!payload.username) {
      return badRequest('username is required')
    }

    if (!payload.password || payload.password.length < 8) {
      return badRequest('password must be at least 8 characters')
    }

    const duplicate = usersFixture.some(
      (item) => item.username.toLowerCase() === payload.username?.toLowerCase()
    )
    if (duplicate) {
      return HttpResponse.json({ username: ['Username already exists.'] }, { status: 400 })
    }

    const nextId = usersFixture.length + 1
    const user = {
      id: nextId,
      username: payload.username,
      email: payload.email ?? `member${nextId}@ils.local`,
    }

    usersFixture.push({
      ...user,
      first_name: payload.username,
      last_name: 'User',
      is_active: true,
      is_staff: false,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const tokens = issueAuthTokens({ id: user.id })

    return HttpResponse.json(
      {
        access: tokens.access,
        refresh: tokens.refresh,
        user: toAuthUser(user),
      },
      { status: 201 }
    )
  }),

  http.post('*/api/auth/login/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; password?: string }

    if (!payload.username || !payload.password) {
      return HttpResponse.json({ detail: 'Invalid credentials.' }, { status: 401 })
    }

    const user = usersFixture.find((item) => item.username === payload.username)
    if (!user || payload.password === 'wrong' || !user.is_active) {
      return HttpResponse.json({ detail: 'Invalid credentials.' }, { status: 401 })
    }

    const tokens = issueAuthTokens({
      id: user.id,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
    })

    return HttpResponse.json({
      access: tokens.access,
      refresh: tokens.refresh,
      user: toAuthUser(user),
    })
  }),

  http.post('*/api/auth/token/refresh/', async ({ request }) => {
    const payload = (await request.json()) as { refresh?: string; device_info?: string }

    if (!payload.refresh) {
      return HttpResponse.json({ detail: 'refresh is required' }, { status: 400 })
    }

    const userId = parseUserIdFromRefreshToken(payload.refresh) ?? usersFixture[0]?.id ?? 1
    const user = usersFixture.find((item) => item.id === userId) ?? usersFixture[0]
    const tokens = issueAuthTokens({
      id: user.id,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
    })

    return HttpResponse.json({
      access: tokens.access,
      refresh: tokens.refresh,
    })
  }),

  http.post('*/api/auth/logout/', async ({ request }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    const payload = (await request.json()) as { refresh?: string }

    if (!payload.refresh) {
      return HttpResponse.json({ detail: 'refresh is required' }, { status: 400 })
    }

    return HttpResponse.json({ detail: 'Logged out successfully.' }, { status: 200 })
  }),

  http.post('*/api/auth/logout-all/', ({ request }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    return HttpResponse.json(
      {
        detail: 'Logged out all sessions.',
        revoked_count: 1,
      },
      { status: 200 }
    )
  }),

  http.get('*/api/auth/sso/redirect/', () => new HttpResponse(null, { status: 302, headers: { Location: ssoRedirectUrl } })),

  http.get('*/api/auth/sso/callback/', ({ request }) => {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) {
        return HttpResponse.json({ code: ['This field is required.'] }, { status: 400 })
      }

      const user = usersFixture[0]
      const tokens = issueAuthTokens({
        id: user.id,
        is_staff: user.is_staff,
        is_superuser: user.is_superuser,
      })

      return HttpResponse.json({
        access: tokens.access,
        refresh: tokens.refresh,
        user: toAuthUser(user),
      })
    }),

  http.post('*/api/auth/identity/link/', async ({ request }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    const payload = (await request.json()) as {
      provider?: 'authentik' | 'google' | 'github'
      external_id?: string
    }

    if (!payload.external_id) {
      return badRequest('external_id is required')
    }

    return HttpResponse.json({
      detail: 'Identity linked successfully.',
      provider: payload.provider ?? 'authentik',
      external_id: payload.external_id,
      created: true,
    })
  }),
]
