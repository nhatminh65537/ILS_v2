import { http, HttpResponse } from 'msw'
import { leaderboardFixture } from '@/mocks/data/fixtures'

export const leaderboardHandlers = [
  http.get('*/api/leaderboard/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const sortBy = url.searchParams.get('sort_by') ?? 'total'

    const sorted = [...leaderboardFixture].sort((left, right) => {
      if (sortBy === 'learning') {
        return right.total_learning_point - left.total_learning_point
      }
      if (sortBy === 'challenge') {
        return right.total_challenge_point - left.total_challenge_point
      }
      if (sortBy === 'quiz') {
        return right.total_quiz_point - left.total_quiz_point
      }
      return right.total_points - left.total_points
    })

    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
    const entries = sorted.slice(safeOffset, safeOffset + safeLimit).map((entry, index) => ({
      ...entry,
      rank: safeOffset + index + 1,
    }))

    return HttpResponse.json({
      total_count: sorted.length,
      entries,
    })
  }),
]
