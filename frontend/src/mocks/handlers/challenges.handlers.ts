import { http, HttpResponse } from 'msw'
import {
  challengeFlagsFixture,
  challengeInstancesFixture,
  challengeProgressFixture,
  challengeSubmissionsFixture,
  challengesFixture,
} from '@/mocks/data/fixtures'
import { notFound, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ChallengeSource, InstanceStatus } from '@/types/challenge.types'

export const challengesHandlers = [
  // ── List challenges (flat search) ──────────────────────────────────────────────
  http.get('*/api/challenge/challenges/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const difficulty = url.searchParams.get('difficulty')
    const categoryId = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const statusFilter = url.searchParams.get('status')
    const tagsParam = url.searchParams.get('tags')
    const solvedParam = url.searchParams.get('solved')

    const solvedIds = new Set(challengeProgressFixture.filter((p) => p.solved).map((p) => p.challenge_id))

    let results = [...challengesFixture]
    if (difficulty) results = results.filter((c) => c.difficulty === difficulty)
    if (categoryId) results = results.filter((c) => c.category === Number(categoryId))
    if (search) {
      const q = search.toLowerCase()
      results = results.filter((c) => c.title.toLowerCase().includes(q))
    }
    if (statusFilter) results = results.filter((c) => c.status === statusFilter)

    // Tag AND-filter: keep only challenges carrying *all* requested tag ids.
    if (tagsParam) {
      const wantedTagIds = tagsParam.split(',').map((s) => Number(s.trim())).filter(Boolean)
      results = results.filter((c) => {
        const ids = new Set((c.tags ?? []).map((tg) => tg.id))
        return wantedTagIds.every((id) => ids.has(id))
      })
    }

    if (solvedParam === 'true') results = results.filter((c) => solvedIds.has(c.id))
    if (solvedParam === 'false') results = results.filter((c) => !solvedIds.has(c.id))

    // Attach is_solved like the backend list serializer.
    const withSolved = results.map((c) => ({ ...c, is_solved: solvedIds.has(c.id) }))

    return HttpResponse.json(
      toPaginatedResponse(withSolved, { limit, offset, basePath: '/api/challenge/challenges/' })
    )
  }),

  // ── Create challenge ─────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof challengesFixture)[number]>
    const now = new Date().toISOString()
    const nextId = challengesFixture.length + 1
    const created = {
      id: nextId,
      slug: payload.slug ?? `challenge-${nextId}`,
      title: payload.title ?? `Challenge ${nextId}`,
      description: payload.description,
      status: payload.status ?? 'draft',
      difficulty: payload.difficulty,
      category: payload.category,
      source: payload.source ?? ChallengeSource.Manual,
      storage_path: payload.storage_path ?? `/challenges/challenge-${nextId}`,
      gitlab_path: payload.gitlab_path,
      challenge_point: payload.challenge_point ?? 0,
      instance_required: payload.instance_required ?? false,
      tags: payload.tags ?? [],
      created_at: now,
      updated_at: now,
    }
    challengesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  // ── Challenge detail ─────────────────────────────────────────────────────────
  http.get('*/api/challenge/challenges/:slug/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    return HttpResponse.json(challenge)
  }),

  // ── Update challenge ─────────────────────────────────────────────────────────
  http.patch('*/api/challenge/challenges/:slug/', async ({ params, request }) => {
    const slug = String(params.slug)
    const index = challengesFixture.findIndex((c) => c.slug === slug)
    if (index < 0) return notFound('Challenge not found')
    const payload = (await request.json()) as Partial<(typeof challengesFixture)[number]>
    const updated = { ...challengesFixture[index], ...payload, updated_at: new Date().toISOString() }
    challengesFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  // ── Delete challenge ─────────────────────────────────────────────────────────
  http.delete('*/api/challenge/challenges/:slug/', ({ params }) => {
    const slug = String(params.slug)
    const index = challengesFixture.findIndex((c) => c.slug === slug)
    if (index < 0) return notFound('Challenge not found')
    challengesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Flags ────────────────────────────────────────────────────────────────────
  http.get('*/api/challenge/challenges/:slug/flags/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')
    const flags = challengeFlagsFixture.filter((f) => f.challenge_id === challenge.id)
    return HttpResponse.json(flags)
  }),

  // ── Submit flag ──────────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/:slug/submit/', async ({ params, request }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')

    const payload = (await request.json()) as { flag?: string }
    const correctFlag = challengeFlagsFixture.find((f) => f.challenge_id === challenge.id)
    const isCorrect = Boolean(payload.flag && correctFlag && payload.flag === correctFlag.flag_value)

    challengeSubmissionsFixture.push({
      id: challengeSubmissionsFixture.length + 1,
      user_id: 1,
      challenge_id: challenge.id,
      flag_submitted: payload.flag ?? '',
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    })

    const progressIdx = challengeProgressFixture.findIndex((p) => p.challenge_id === challenge.id)
    if (progressIdx >= 0) {
      const p = challengeProgressFixture[progressIdx]
      challengeProgressFixture[progressIdx] = {
        ...p,
        solved: isCorrect ? true : p.solved,
        attempt_count: p.attempt_count + 1,
        first_solved_at: isCorrect && !p.first_solved_at ? new Date().toISOString() : p.first_solved_at,
        updated_at: new Date().toISOString(),
      }
    } else if (isCorrect) {
      const now2 = new Date().toISOString()
      challengeProgressFixture.push({
        id: challengeProgressFixture.length + 1,
        user_id: 1,
        challenge_id: challenge.id,
        solved: true,
        attempt_count: 1,
        first_solved_at: now2,
        created_at: now2,
        updated_at: now2,
      })
    }

    return HttpResponse.json({ correct: isCorrect })
  }),

  // ── Per-challenge progress ───────────────────────────────────────────────────
  http.get('*/api/challenge/challenges/:slug/progress/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')

    const progress = challengeProgressFixture.find((p) => p.challenge_id === challenge.id)
    return HttpResponse.json({
      is_solved: progress?.solved ?? false,
      attempt_count: progress?.attempt_count ?? 0,
      completed_at: progress?.first_solved_at ?? null,
    })
  }),

  // ── Instance start ───────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/:slug/instance/start/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')

    const running = challengeInstancesFixture.find(
      (i) => i.challenge_id === challenge.id && i.status === InstanceStatus.Running
    )
    if (running) return HttpResponse.json(running)

    const now = new Date().toISOString()
    const instance = {
      id: challengeInstancesFixture.length + 1,
      user_id: 1,
      challenge_id: challenge.id,
      challenge_flag_id: 1,
      status: InstanceStatus.Running,
      instance_info: {
        host: `10.0.0.${challengeInstancesFixture.length + 10}`,
        port: 8080,
        note: 'Mock instance — Wave 1',
      },
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
    }
    challengeInstancesFixture.push(instance)
    return HttpResponse.json(instance, { status: 201 })
  }),

  // ── Instance stop ────────────────────────────────────────────────────────────
  http.post('*/api/challenge/challenges/:slug/instance/stop/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')

    const idx = challengeInstancesFixture.findIndex(
      (i) => i.challenge_id === challenge.id && i.status === InstanceStatus.Running
    )
    if (idx < 0) return HttpResponse.json({ detail: 'No running instance found.' }, { status: 404 })

    challengeInstancesFixture[idx] = {
      ...challengeInstancesFixture[idx],
      status: InstanceStatus.Stopped,
      updated_at: new Date().toISOString(),
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Instance status ──────────────────────────────────────────────────────────
  http.get('*/api/challenge/challenges/:slug/instance/status/', ({ params }) => {
    const slug = String(params.slug)
    const challenge = challengesFixture.find((c) => c.slug === slug)
    if (!challenge) return notFound('Challenge not found')

    const instance = [...challengeInstancesFixture]
      .reverse()
      .find((i) => i.challenge_id === challenge.id)

    if (!instance) return HttpResponse.json({ status: 'none' })
    return HttpResponse.json(instance)
  }),

  // ── Global aggregate progress ────────────────────────────────────────────────
  http.get('*/api/challenge/progress/', () => {
    const solved_count = challengeProgressFixture.filter((p) => p.solved).length
    const total_attempts = challengeSubmissionsFixture.length
    return HttpResponse.json({ solved_count, total_attempts })
  }),
]
