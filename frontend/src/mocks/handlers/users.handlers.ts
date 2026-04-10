import { http, HttpResponse } from 'msw'
import { activityFixture, profileFixture, usersFixture } from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'

let profile = { ...profileFixture }

export const usersHandlers = [
  // ─── Specific /me/* routes must come before wildcard /:id/ ───────────────

  http.get('*/api/users/me/', () => HttpResponse.json(usersFixture[0])),

  http.get('*/api/users/me/profile/', () => HttpResponse.json(profile)),

  http.patch('*/api/users/me/profile/', async ({ request }) => {
    const payload = (await request.json()) as Partial<typeof profile>
    profile = {
      ...profile,
      ...payload,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(profile)
  }),

  http.patch('*/api/users/me/settings/', async ({ request }) => {
    const payload = (await request.json()) as Partial<Pick<typeof profile, 'language' | 'theme' | 'timezone'>>
    profile = {
      ...profile,
      ...payload,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(profile)
  }),

  http.patch('*/api/users/me/account/', async ({ request }) => {
    const payload = (await request.json()) as { username?: string; email?: string }
    const updatedUser = {
      ...usersFixture[0],
      ...(payload.username ? { username: payload.username } : {}),
      ...(payload.email ? { email: payload.email } : {}),
      updated_at: new Date().toISOString(),
    }
    usersFixture[0] = updatedUser
    return HttpResponse.json(updatedUser)
  }),

  http.get('*/api/users/me/activity/', () => HttpResponse.json(activityFixture)),

  // ─── Public profile routes — must come before wildcard /:id/ ─────────────

  http.get('*/api/users/:username/profile/', ({ params }) => {
    return HttpResponse.json({
      username: String(params.username),
      entry_year: profile.entry_year,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      total_learning_point: profile.total_learning_point,
      total_challenge_point: profile.total_challenge_point,
      total_quiz_point: profile.total_quiz_point,
      course_completed: profile.course_completed,
      challenge_completed: profile.challenge_completed,
      quiz_completed: profile.quiz_completed,
      last_active_at: profile.last_active_at,
    })
  }),

  http.get('*/api/users/:username/activity/', () => HttpResponse.json(activityFixture)),

  // ─── Generic user list + CRUD ─────────────────────────────────────────────

  http.get('*/api/users/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(toPaginatedResponse(usersFixture, { limit, offset, basePath: '/api/users/' }))
  }),

  http.post('*/api/users/', async ({ request }) => {
    const payload = (await request.json()) as {
      username?: string
      email?: string
      first_name?: string
      last_name?: string
      is_active?: boolean
    }

    const now = new Date().toISOString()
    const nextId = usersFixture.length + 1
    const created = {
      id: nextId,
      username: payload.username ?? `member${nextId}`,
      email: payload.email ?? `member${nextId}@ils.local`,
      first_name: payload.first_name ?? 'New',
      last_name: payload.last_name ?? 'User',
      is_active: payload.is_active ?? true,
      is_staff: false,
      is_superuser: false,
      created_at: now,
      updated_at: now,
    }

    usersFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/users/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('User not found')
    }

    const user = usersFixture.find((item) => item.id === id)
    if (!user) {
      return notFound('User not found')
    }

    return HttpResponse.json(user)
  }),

  http.patch('*/api/users/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('User not found')
    }

    const userIndex = usersFixture.findIndex((item) => item.id === id)
    if (userIndex < 0) {
      return notFound('User not found')
    }

    const payload = (await request.json()) as Partial<(typeof usersFixture)[number]>
    const updated = {
      ...usersFixture[userIndex],
      ...payload,
      updated_at: new Date().toISOString(),
    }

    usersFixture[userIndex] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/users/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('User not found')
    }

    const userIndex = usersFixture.findIndex((item) => item.id === id)
    if (userIndex < 0) {
      return notFound('User not found')
    }

    usersFixture.splice(userIndex, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
