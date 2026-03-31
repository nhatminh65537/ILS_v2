import { http, HttpResponse } from 'msw'
import { usersFixture } from '@/mocks/data/fixtures'
import { badRequest } from '@/mocks/handlers/shared'

const randomToken = (prefix: string): string => `${prefix}.${Math.random().toString(36).slice(2)}.mock`

export const authHandlers = [
  http.post('*/api/auth/register/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; email?: string }

    if (!payload.username) {
      return badRequest('username is required')
    }

    const nextId = usersFixture.length + 1
    const now = new Date().toISOString()
    const user = {
      id: nextId,
      username: payload.username,
      email: payload.email ?? `member${nextId}@ils.local`,
      first_name: payload.username,
      last_name: 'User',
      is_active: true,
      is_staff: false,
      is_superuser: false,
      created_at: now,
      updated_at: now,
    }

    usersFixture.push(user)

    return HttpResponse.json(
      {
        access: randomToken('access'),
        refresh: randomToken('refresh'),
        user,
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
      user,
    })
  }),

  http.post('*/api/auth/token/refresh/', async ({ request }) => {
    const payload = (await request.json()) as { refresh?: string }

    if (!payload.refresh) {
      return HttpResponse.json({ detail: 'refresh is required' }, { status: 400 })
    }

    return HttpResponse.json({
      access: randomToken('access'),
      refresh: randomToken('refresh'),
    })
  }),

  http.post('*/api/auth/logout/', () => new HttpResponse(null, { status: 204 })),

  http.post('*/api/auth/logout-all/', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/auth/sso/redirect/', () =>
    HttpResponse.json({
      redirect_url: 'https://authentik.local/application/o/authorize/?client_id=ils&mock=true',
    })
  ),

  http.get('*/api/auth/sso/callback/', () =>
    HttpResponse.json({
      access: randomToken('access'),
      refresh: randomToken('refresh'),
      user: usersFixture[0],
    })
  ),

  http.post('*/api/auth/identity/link/', () => HttpResponse.json({ success: true })),
]
