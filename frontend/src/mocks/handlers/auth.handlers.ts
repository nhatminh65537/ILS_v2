import { http, HttpResponse } from 'msw'
import { authSessionsFixture, usersFixture } from '@/mocks/data/fixtures'
import {
  buildMockAccessToken,
  buildMockRefreshToken,
  getPermissionIdsByNames,
  parseUserIdFromRefreshToken,
  permissionFixtures,
} from '@/mocks/handlers/admin-permissions'
import { badRequest, parseNumericId } from '@/mocks/handlers/shared'

const ssoRedirectUrl = 'https://authentik.local/application/o/authorize/?client_id=ils&mock=true'

const STAFF_PERMISSION_IDS = getPermissionIdsByNames([
  'api.permission.list',
  'api.role.list',
  'api.role.retrieve',
  'api.user_role.list',
  'api.system_config.list',
  'api.system_config.retrieve',
])

const ALL_ADMIN_SECTIONS = [
  'dashboard',
  'config',
  'rbac',
  'users',
  'statistics',
  'notifications',
  'learn',
  'challenges',
  'quizzes',
] as const

const STAFF_ADMIN_SECTIONS = ['dashboard', 'learn', 'challenges', 'quizzes'] as const

const resolvePermissionIdsForUser = (user: { is_superuser?: boolean; is_staff?: boolean }): number[] => {
  if (user.is_superuser) {
    return permissionFixtures.map((permission) => permission.id)
  }

  if (user.is_staff) {
    return STAFF_PERMISSION_IDS
  }

  return []
}

const resolveAdminSectionsForUser = (user: { is_superuser?: boolean; is_staff?: boolean }): readonly string[] => {
  if (user.is_superuser) {
    return ALL_ADMIN_SECTIONS
  }
  if (user.is_staff) {
    return STAFF_ADMIN_SECTIONS
  }
  return []
}

const issueAuthTokens = (user: {
  id: number
  is_superuser?: boolean
  is_staff?: boolean
}): { access: string; refresh: string } => {
  const permissionIds = resolvePermissionIdsForUser(user)
  const adminSections = resolveAdminSectionsForUser(user)
  return {
    access: buildMockAccessToken(user.id, permissionIds, adminSections),
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

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  return atob(normalized.padEnd(normalized.length + padLength, '='))
}

const parseUserIdFromAccessToken = (accessToken: string | null): number | null => {
  if (!accessToken) {
    return null
  }

  const segments = accessToken.split('.')
  if (segments.length < 2) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(segments[1])) as { sub?: string }
    const userId = Number(payload.sub)
    return Number.isInteger(userId) && userId > 0 ? userId : null
  } catch {
    return null
  }
}

const sortSessions = (
  sessions: ReadonlyArray<(typeof authSessionsFixture)[number]>
): (typeof authSessionsFixture)[number][] => {
  return [...sessions].sort((a, b) => {
    const left = Date.parse(a.last_used_at ?? '')
    const right = Date.parse(b.last_used_at ?? '')
    const leftTime = Number.isNaN(left) ? 0 : left
    const rightTime = Number.isNaN(right) ? 0 : right
    const delta = rightTime - leftTime
    if (delta !== 0) {
      return delta
    }
    return b.id - a.id
  })
}

const userSessions = new Map<number, typeof authSessionsFixture>()

const getUserSessions = (userId: number): typeof authSessionsFixture => {
  const existing = userSessions.get(userId)
  if (existing) {
    return existing
  }

  const seeded = authSessionsFixture.map((session) => ({
    ...session,
    id: userId * 1000 + session.id,
  }))
  userSessions.set(userId, seeded)
  return seeded
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

  http.get('*/api/auth/sessions/', ({ request }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    const userId = parseUserIdFromAccessToken(accessToken)
    if (!userId) {
      return unauthorized()
    }

    return HttpResponse.json(sortSessions(getUserSessions(userId)))
  }),

  http.delete('*/api/auth/sessions/:id/', ({ request, params }) => {
    const accessToken = resolveAccessToken(request)
    if (!accessToken) {
      return unauthorized()
    }

    const userId = parseUserIdFromAccessToken(accessToken)
    if (!userId) {
      return unauthorized()
    }

    const sessionId = parseNumericId(String(params.id))
    if (!sessionId) {
      return HttpResponse.json({ detail: 'Session not found.' }, { status: 404 })
    }

    const sessions = getUserSessions(userId)
    const index = sessions.findIndex((item) => item.id === sessionId)
    if (index < 0) {
      return HttpResponse.json({ detail: 'Session not found.' }, { status: 404 })
    }

    sessions.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
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
