import { http, HttpResponse } from 'msw'
import { adminUsersFixture } from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import type { AdminUserDto } from '@/types/user.types'

const ROLE_MEMBER = { id: 3, name: 'Member', description: 'Default member role', is_system: true }

export const adminUsersHandlers = [
  // ─── GET /api/admin/users/ — list with optional filters ──────────────────
  http.get('*/api/admin/users/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const isActiveParam = url.searchParams.get('is_active')

    let filtered = [...adminUsersFixture]

    if (isActiveParam !== null && isActiveParam !== '') {
      const wantActive = isActiveParam === 'true' || isActiveParam === '1'
      filtered = filtered.filter((u) => u.is_active === wantActive)
    }

    // date_joined_from / date_joined_to filtering (ISO date string comparison)
    const joinedFrom = url.searchParams.get('date_joined_from')
    const joinedTo = url.searchParams.get('date_joined_to')
    if (joinedFrom) {
      const from = new Date(joinedFrom).getTime()
      filtered = filtered.filter((u) => new Date(u.date_joined).getTime() >= from)
    }
    if (joinedTo) {
      const to = new Date(joinedTo).getTime()
      filtered = filtered.filter((u) => new Date(u.date_joined).getTime() <= to)
    }

    return HttpResponse.json(
      toPaginatedResponse(filtered, { limit, offset, basePath: '/api/admin/users/' })
    )
  }),

  // ─── POST /api/admin/users/ — create user ────────────────────────────────
  http.post('*/api/admin/users/', async ({ request }) => {
    const payload = (await request.json()) as {
      username?: string
      email?: string
      password?: string
      role_ids?: number[]
    }

    const now = new Date().toISOString()
    const nextId = adminUsersFixture.length + 1

    // Resolve roles from role_ids (default: Member)
    const roles = payload.role_ids?.length
      ? adminUsersFixture[0]?.roles
          .filter(() => false) // placeholder — derive from role_ids
          .concat(
            payload.role_ids.map((id) => ({
              id,
              name: id === 1 ? 'Admin' : id === 2 ? 'Editor' : 'Member',
              description: '',
              is_system: true,
            }))
          ) ?? [ROLE_MEMBER]
      : [ROLE_MEMBER]

    const created: AdminUserDto = {
      id: nextId,
      username: payload.username ?? `user${nextId}`,
      email: payload.email ?? `user${nextId}@ils.local`,
      first_name: '',
      last_name: '',
      is_active: true,
      is_staff: false,
      is_superuser: false,
      date_joined: now,
      last_login: null,
      profile: null,
      roles,
    }

    adminUsersFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  // ─── GET /api/admin/users/{id}/ — detail ─────────────────────────────────
  http.get('*/api/admin/users/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) return notFound('User not found')

    const user = adminUsersFixture.find((u) => u.id === id)
    if (!user) return notFound('User not found')

    return HttpResponse.json(user)
  }),

  // ─── PATCH /api/admin/users/{id}/ — update ───────────────────────────────
  http.patch('*/api/admin/users/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) return notFound('User not found')

    const index = adminUsersFixture.findIndex((u) => u.id === id)
    if (index < 0) return notFound('User not found')

    const payload = (await request.json()) as {
      is_active?: boolean
      role_ids?: number[]
      username?: string
      email?: string
    }

    const current = adminUsersFixture[index]

    // Resolve roles if role_ids provided
    const roles =
      payload.role_ids !== undefined
        ? payload.role_ids.map((rid) => ({
            id: rid,
            name: rid === 1 ? 'Admin' : rid === 2 ? 'Editor' : 'Member',
            description: '',
            is_system: true,
          }))
        : current.roles

    const updated: AdminUserDto = {
      ...current,
      ...(payload.username !== undefined ? { username: payload.username } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      roles,
    }

    adminUsersFixture[index] = updated
    return HttpResponse.json(updated)
  }),
]
