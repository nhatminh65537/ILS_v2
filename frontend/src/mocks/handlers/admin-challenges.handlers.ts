import { http, HttpResponse } from 'msw'
import {
  challengeCategoriesFixture,
  challengeFlagsFixture,
  challengeInstancesFixture,
  challengeNodesFixture,
  challengeProgressFixture,
  challengesFixture,
  challengeTagsFixture,
  usersFixture,
} from '@/mocks/data/fixtures'
import { notFound, toPaginatedResponse } from '@/mocks/handlers/shared'
import { InstanceStatus, type ChallengeNode } from '@/types/challenge.types'

const sortFolderFirst = (a: ChallengeNode, b: ChallengeNode): number => {
  if (a.is_item !== b.is_item) {
    return a.is_item ? 1 : -1
  }
  const byTitle = a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  return byTitle !== 0 ? byTitle : a.id - b.id
}

/** Build the explorer response (folders + visible items + breadcrumb) for a folder. */
const buildExplorerResponse = (folder: ChallengeNode | null) => {
  const parentId = folder?.id ?? null
  const solvedIds = new Set(challengeProgressFixture.filter((p) => p.solved).map((p) => p.challenge_id))

  const nodes = challengeNodesFixture
    .filter((n) => (n.parent ?? null) === parentId)
    .sort(sortFolderFirst)
    .map((node) => {
      if (!node.is_item || node.challenge == null) {
        return { id: node.id, is_item: node.is_item, title: node.title, path: node.path, challenge: null }
      }
      const challenge = challengesFixture.find((c) => c.id === node.challenge)
      return {
        id: node.id,
        is_item: node.is_item,
        title: node.title,
        path: node.path,
        challenge: challenge
          ? {
              id: challenge.id,
              slug: challenge.slug,
              title: challenge.title,
              difficulty: challenge.difficulty,
              status: challenge.status,
              challenge_point: challenge.challenge_point,
              instance_required: challenge.instance_required,
              category_name: challenge.category_name ?? null,
              tags: challenge.tags ?? [],
              is_solved: solvedIds.has(challenge.id),
            }
          : null,
      }
    })
    // Members only see published items; drafts are hidden in the explorer.
    .filter((n) => !n.is_item || (n.challenge && n.challenge.status === 'published'))

  // Breadcrumb: walk ancestor path (ids) then append the folder itself.
  const breadcrumb: { id: number; title: string }[] = []
  if (folder) {
    const ancestorIds = folder.path ? folder.path.split('.').map(Number) : []
    for (const aid of ancestorIds) {
      const anc = challengeNodesFixture.find((n) => n.id === aid)
      if (anc) breadcrumb.push({ id: anc.id, title: anc.title })
    }
    breadcrumb.push({ id: folder.id, title: folder.title })
  }

  return {
    folder: folder ? { id: folder.id, title: folder.title, path: folder.path } : null,
    breadcrumb,
    nodes,
  }
}

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
  // Folder-first (is_item asc), then title A->Z — mirrors the backend ordering.
  http.get('*/api/challenge/nodes/', () => {
    const roots = challengeNodesFixture.filter((n) => !n.parent).sort(sortFolderFirst)
    return HttpResponse.json(roots)
  }),

  http.get('*/api/challenge/nodes/:id/children/', ({ params }) => {
    const parentId = Number(params.id)
    const children = challengeNodesFixture.filter((n) => n.parent === parentId).sort(sortFolderFirst)
    return HttpResponse.json(children)
  }),

  http.post('*/api/challenge/nodes/', async ({ request }) => {
    const payload = (await request.json()) as {
      title: string
      parent_id?: number | null
      is_item?: boolean
    }
    const parentId = payload.parent_id ?? null
    const parent = parentId ? challengeNodesFixture.find((n) => n.id === parentId) : null
    const newId = Math.max(0, ...challengeNodesFixture.map((n) => n.id)) + 1
    const isItem = payload.is_item ?? false

    // Atomic item create synthesises a draft challenge (slug from title).
    let challengeId: number | null = null
    let challengeSlug: string | undefined
    if (isItem) {
      const slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'challenge'
      challengeId = Math.max(0, ...challengesFixture.map((c) => c.id)) + 1
      challengeSlug = slug
      challengesFixture.push({
        id: challengeId,
        slug,
        title: payload.title,
        status: 'draft',
        source: 'manual' as never,
        storage_path: `challenges/${slug}`,
        challenge_point: 0,
        instance_required: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
    }

    const path = parent ? (parent.path ? `${parent.path}.${parent.id}` : String(parent.id)) : ''
    const newNode = {
      id: newId,
      challenge: challengeId,
      challenge_slug: challengeSlug ?? null,
      parent: parentId,
      path,
      position: 99,
      title: payload.title,
      is_item: isItem,
    }
    challengeNodesFixture.push(newNode)
    return HttpResponse.json(newNode, { status: 201 })
  }),

  http.patch('*/api/challenge/nodes/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = challengeNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    const payload = (await request.json()) as { title?: string }
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
    const parentId = payload.parent_id ?? null
    const parent = parentId ? challengeNodesFixture.find((n) => n.id === parentId) : null
    const path = parent ? (parent.path ? `${parent.path}.${parent.id}` : String(parent.id)) : ''
    challengeNodesFixture[index] = { ...challengeNodesFixture[index], parent: parentId, path }
    return HttpResponse.json(challengeNodesFixture[index])
  }),

  // ── File-explorer (folders + visible challenge items + breadcrumb) ─────────────
  http.get('*/api/challenge/nodes/explorer/', () => {
    return HttpResponse.json(buildExplorerResponse(null))
  }),

  http.get('*/api/challenge/nodes/:id/explorer/', ({ params }) => {
    const folderId = Number(params.id)
    const folder = challengeNodesFixture.find((n) => n.id === folderId)
    if (!folder) return notFound('Folder not found')
    return HttpResponse.json(buildExplorerResponse(folder))
  }),

  // ── Flag CRUD (admin) ─────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/:slug/flags/', async ({ params, request }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    const payload = (await request.json()) as {
      flag_value: string
      is_regex?: boolean
      is_case_sensitive?: boolean
      random_tail_length?: number
    }
    const now = new Date().toISOString()
    const created = {
      id: challengeFlagsFixture.length + 1,
      challenge_id: challenge.id,
      flag_value: payload.flag_value,
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
