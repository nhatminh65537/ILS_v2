import { http, HttpResponse } from 'msw'
import { usersFixture } from '@/mocks/data/fixtures'
import { badRequest } from '@/mocks/handlers/shared'

const randomToken = (prefix: string): string => `${prefix}.${Math.random().toString(36).slice(2)}.mock`
const ssoRedirectUrl = 'https://authentik.local/application/o/authorize/?client_id=ils&mock=true'

const toAuthUser = (user: { id: number; username: string; email: string }) => ({
  id: user.id,
  username: user.username,
  email: user.email,
})

export const authHandlers = [
  http.post('*/api/auth/register/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; email?: string; password?: string }

    if (!payload.username) {
      return badRequest('username is required')
    }

    if (!payload.password || payload.password.length < 8) {
      return badRequest('password must be at least 8 characters')
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

    return HttpResponse.json(
      {
        access: randomToken('access'),
        refresh: randomToken('refresh'),
        user: toAuthUser(user),
      },
      { status: 201 }
    )
  }),

  http.post('*/api/auth/login/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; password?: string }

    if (!payload.username || !payload.password) {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 400 })
    }

    if (payload.password === 'wrong') {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
    }

    const user = usersFixture.find((item) => item.username === payload.username) ?? usersFixture[0]

    return HttpResponse.json({
      access: randomToken('access'),
      refresh: randomToken('refresh'),
      user: toAuthUser(user),
    })
  }),

  http.post('*/api/auth/token/refresh/', async ({ request }) => {
    const payload = (await request.json()) as { refresh?: string; device_info?: string }

    if (!payload.refresh) {
      return HttpResponse.json({ detail: 'refresh is required' }, { status: 400 })
    }

    return HttpResponse.json({
      access: randomToken('access'),
      refresh: randomToken('refresh'),
    })
  }),

  http.post('*/api/auth/logout/', async ({ request }) => {
    const payload = (await request.json()) as { refresh?: string }

    if (!payload.refresh) {
      return HttpResponse.json({ detail: 'refresh is required' }, { status: 400 })
    }

    return HttpResponse.json({ detail: 'Logged out successfully.' }, { status: 200 })
  }),

  http.post('*/api/auth/logout-all/', () =>
    HttpResponse.json(
      {
        detail: 'Logged out all sessions.',
        revoked_count: 1,
      },
      { status: 200 }
    )
  ),

  http.get('*/api/auth/sso/redirect/', () => new HttpResponse(null, { status: 302, headers: { Location: ssoRedirectUrl } })),

  http.get('*/api/auth/sso/callback/', () =>
    HttpResponse.json({
      access: randomToken('access'),
      refresh: randomToken('refresh'),
      user: toAuthUser(usersFixture[0]),
    })
  ),

  http.post('*/api/auth/identity/link/', async ({ request }) => {
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
