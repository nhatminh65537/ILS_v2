import { http, HttpResponse } from 'msw'
import {
  challengeFlagsFixture,
  challengeInstancesFixture,
  challengeNodesFixture,
  challengeProgressFixture,
  challengeSubmissionsFixture,
  challengesFixture,
} from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ChallengeSource, InstanceStatus } from '@/types/challenge.types'

export const challengesHandlers = [
  http.get('*/api/challenges/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(challengesFixture, {
        limit,
        offset,
        basePath: '/api/challenges/',
      })
    )
  }),

  http.post('*/api/challenges/', async ({ request }) => {
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
      category_id: payload.category_id,
      source: payload.source ?? ChallengeSource.Manual,
      storage_path: payload.storage_path ?? `/challenges/challenge-${nextId}`,
      gitlab_path: payload.gitlab_path,
      challenge_point: payload.challenge_point ?? 0,
      instance_required: payload.instance_required ?? false,
      tags: payload.tags,
      created_at: now,
      updated_at: now,
    }

    challengesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/challenges/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const challenge = challengesFixture.find((item) => item.id === id)
    if (!challenge) {
      return notFound('Challenge not found')
    }

    return HttpResponse.json(challenge)
  }),

  http.patch('*/api/challenges/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const index = challengesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Challenge not found')
    }

    const payload = (await request.json()) as Partial<(typeof challengesFixture)[number]>
    const updated = {
      ...challengesFixture[index],
      ...payload,
      updated_at: new Date().toISOString(),
    }

    challengesFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/challenges/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const index = challengesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Challenge not found')
    }

    challengesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/challenges/:id/tree/', ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const parent = new URL(request.url).searchParams.get('parent')
    const parentId = parent ? parseNumericId(parent) : null
    const nodes = challengeNodesFixture.filter((item) => item.challenge_id === id)

    return HttpResponse.json(parentId ? nodes.filter((item) => item.parent_id === parentId) : nodes)
  }),

  http.get('*/api/challenges/:id/flags/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const flags = challengeFlagsFixture.filter((item) => item.challenge_id === id)
    return HttpResponse.json(flags)
  }),

  http.post('*/api/challenges/:id/submit_flag/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const payload = (await request.json()) as { flag?: string }
    const correctFlag = challengeFlagsFixture.find((item) => item.challenge_id === id)
    const isCorrect = Boolean(payload.flag && correctFlag && payload.flag === correctFlag.flag_value)

    challengeSubmissionsFixture.push({
      id: challengeSubmissionsFixture.length + 1,
      user_id: 1,
      challenge_id: id,
      flag_submitted: payload.flag ?? '',
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    })

    return HttpResponse.json({
      correct: isCorrect,
      message: isCorrect ? 'Correct flag' : 'Incorrect flag',
    })
  }),

  http.get('*/api/challenges/:id/progress/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const progress = challengeProgressFixture.find((item) => item.challenge_id === id)
    if (!progress) {
      return HttpResponse.json({
        challenge_id: id,
        solved: false,
        attempt_count: 0,
      })
    }

    return HttpResponse.json({
      challenge_id: id,
      solved: progress.solved,
      attempt_count: progress.attempt_count,
      first_solved_at: progress.first_solved_at,
    })
  }),

  http.post('*/api/challenges/:id/create_instance/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Challenge not found')
    }

    const now = new Date().toISOString()
    const instance = {
      id: challengeInstancesFixture.length + 1,
      user_id: 1,
      challenge_id: id,
      challenge_flag_id: 1,
      status: InstanceStatus.Running,
      deployment_info: {
        endpoint: `https://instance-${challengeInstancesFixture.length + 1}.ils.local`,
      },
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
    }

    challengeInstancesFixture.push(instance)
    return HttpResponse.json(instance, { status: 201 })
  }),
]
