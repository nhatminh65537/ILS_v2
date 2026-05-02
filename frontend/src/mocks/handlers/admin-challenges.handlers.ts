import { http, HttpResponse } from 'msw'
import {
  challengeCategoriesFixture,
  challengeFlagsFixture,
  challengeInstancesFixture,
  challengeNodesFixture,
  challengesFixture,
  challengeTagsFixture,
  usersFixture,
} from '@/mocks/data/fixtures'
import { notFound, toPaginatedResponse } from '@/mocks/handlers/shared'
import { InstanceStatus } from '@/types/challenge.types'

export const adminChallengesHandlers = [
  // ── Categories ───────────────────────────────────────────────────────────────
  http.get('*/api/challenge/categories/', () => {
    return HttpResponse.json(challengeCategoriesFixture)
  }),

  http.post('*/api/challenge/categories/', async ({ request }) => {
    const payload = (await request.json()) as { name: string; description?: string }
    const now = new Date().toISOString()
    const created = {
      id: challengeCategoriesFixture.length + 1,
      name: payload.name,
      description: payload.description ?? '',
      created_at: now,
      updated_at: now,
    }
    challengeCategoriesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/api/challenge/categories/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = challengeCategoriesFixture.findIndex((c) => c.id === id)
    if (index < 0) return notFound('Category not found')
    const payload = (await request.json()) as { name?: string; description?: string }
    const now = new Date().toISOString()
    challengeCategoriesFixture[index] = { ...challengeCategoriesFixture[index], ...payload, updated_at: now }
    return HttpResponse.json(challengeCategoriesFixture[index])
  }),

  http.delete('*/api/challenge/categories/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = challengeCategoriesFixture.findIndex((c) => c.id === id)
    if (index < 0) return notFound('Category not found')
    challengeCategoriesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Tags ─────────────────────────────────────────────────────────────────────
  http.get('*/api/challenge/tags/', () => {
    return HttpResponse.json(challengeTagsFixture)
  }),

  http.post('*/api/challenge/tags/', async ({ request }) => {
    const payload = (await request.json()) as { name: string; description?: string }
    const created = {
      id: challengeTagsFixture.length + 1,
      name: payload.name,
      description: payload.description ?? '',
    }
    challengeTagsFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/api/challenge/tags/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = challengeTagsFixture.findIndex((t) => t.id === id)
    if (index < 0) return notFound('Tag not found')
    const payload = (await request.json()) as { name?: string; description?: string }
    challengeTagsFixture[index] = { ...challengeTagsFixture[index], ...payload }
    return HttpResponse.json(challengeTagsFixture[index])
  }),

  http.delete('*/api/challenge/tags/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = challengeTagsFixture.findIndex((t) => t.id === id)
    if (index < 0) return notFound('Tag not found')
    challengeTagsFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Challenge nodes (tree) ────────────────────────────────────────────────────
  http.get('*/api/challenge/nodes/', () => {
    const roots = challengeNodesFixture.filter((n) => !n.parent_id)
    return HttpResponse.json(roots)
  }),

  http.get('*/api/challenge/nodes/:id/children/', ({ params }) => {
    const parentId = Number(params.id)
    const children = challengeNodesFixture.filter((n) => n.parent_id === parentId)
    return HttpResponse.json(children)
  }),

  http.post('*/api/challenge/nodes/', async ({ request }) => {
    const payload = (await request.json()) as {
      title: string
      parent_id?: number | null
      position?: number
      is_item?: boolean
      challenge_id?: number | null
    }
    const newNode = {
      id: challengeNodesFixture.length + 100,
      challenge_id: payload.challenge_id ?? null,
      parent_id: payload.parent_id ?? null,
      path: payload.parent_id ? `${payload.parent_id}.${challengeNodesFixture.length + 100}` : `${challengeNodesFixture.length + 100}`,
      position: payload.position ?? 99,
      title: payload.title,
      is_item: payload.is_item ?? false,
    }
    challengeNodesFixture.push(newNode)
    return HttpResponse.json(newNode, { status: 201 })
  }),

  http.patch('*/api/challenge/nodes/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = challengeNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    const payload = (await request.json()) as { title?: string; parent_id?: number | null; position?: number }
    challengeNodesFixture[index] = { ...challengeNodesFixture[index], ...payload }
    return HttpResponse.json(challengeNodesFixture[index])
  }),

  http.delete('*/api/challenge/nodes/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = challengeNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    challengeNodesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/challenge/nodes/:id/move/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = challengeNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    const payload = (await request.json()) as { parent_id: number | null }
    challengeNodesFixture[index] = { ...challengeNodesFixture[index], parent_id: payload.parent_id ?? undefined }
    return HttpResponse.json(challengeNodesFixture[index])
  }),

  // ── Flag CRUD (admin) ─────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/:slug/flags/', async ({ params, request }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    const payload = (await request.json()) as {
      flag_value: string
      flag_type?: string
      is_regex?: boolean
      is_case_sensitive?: boolean
      random_tail_length?: number
    }
    const now = new Date().toISOString()
    const created = {
      id: challengeFlagsFixture.length + 1,
      challenge_id: challenge.id,
      flag_value: payload.flag_value,
      flag_type: (payload.flag_type ?? (payload.is_regex ? 'regex' : 'static')) as 'static' | 'regex' | 'instance',
      is_regex: payload.is_regex ?? false,
      is_case_sensitive: payload.is_case_sensitive ?? true,
      random_tail_length: payload.random_tail_length ?? 0,
      created_at: now,
    }
    challengeFlagsFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/api/challenge/challenges/:slug/flags/:id/', async ({ params, request }) => {
    const slug = String(params.slug)
    const flagId = Number(params.id)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    const index = challengeFlagsFixture.findIndex((f) => f.id === flagId && f.challenge_id === challenge.id)
    if (index < 0) return notFound('Flag not found')
    const payload = (await request.json()) as Partial<(typeof challengeFlagsFixture)[number]>
    challengeFlagsFixture[index] = { ...challengeFlagsFixture[index], ...payload }
    return HttpResponse.json(challengeFlagsFixture[index])
  }),

  http.delete('*/api/challenge/challenges/:slug/flags/:id/', ({ params }) => {
    const slug = String(params.slug)
    const flagId = Number(params.id)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    const index = challengeFlagsFixture.findIndex((f) => f.id === flagId && f.challenge_id === challenge.id)
    if (index < 0) return notFound('Flag not found')
    challengeFlagsFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Admin instances ───────────────────────────────────────────────────────────
  http.get('*/api/challenge/instances/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const statusFilter = url.searchParams.get('status')
    const challengeSlug = url.searchParams.get('challenge_slug')
    const userId = url.searchParams.get('user_id')

    let results = challengeInstancesFixture.map((inst) => {
      const challenge = challengesFixture.find((c) => c.id === inst.challenge_id)
      const user = usersFixture.find((u) => u.id === inst.user_id)
      return {
        ...inst,
        user_username: user?.username ?? `user_${inst.user_id}`,
        challenge_slug: challenge?.slug ?? `challenge_${inst.challenge_id}`,
        challenge_title: challenge?.title ?? `Challenge ${inst.challenge_id}`,
      }
    })

    if (statusFilter) results = results.filter((i) => i.status === statusFilter)
    if (challengeSlug) results = results.filter((i) => i.challenge_slug === challengeSlug)
    if (userId) results = results.filter((i) => i.user_id === Number(userId))

    return HttpResponse.json(toPaginatedResponse(results, { limit, offset, basePath: '/api/challenge/instances/' }))
  }),

  http.post('*/api/challenge/instances/:id/kill/', ({ params }) => {
    const id = Number(params.id)
    const index = challengeInstancesFixture.findIndex((i) => i.id === id)
    if (index < 0) return notFound('Instance not found')
    challengeInstancesFixture[index] = {
      ...challengeInstancesFixture[index],
      status: InstanceStatus.Terminated,
      updated_at: new Date().toISOString(),
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
