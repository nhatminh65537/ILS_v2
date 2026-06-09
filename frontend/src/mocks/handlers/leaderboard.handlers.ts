import { http, HttpResponse } from 'msw'
import { leaderboardFixture } from '@/mocks/data/fixtures'

export const leaderboardHandlers = [
  http.get('*/api/stats/leaderboard/', ({ request }) => {
    const url = new URL(request.url)
    const typeParam = (url.searchParams.get('type') ?? url.searchParams.get('sort_by') ?? 'overall').toLowerCase()
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const canonicalType = typeParam === 'learning' ? 'course' : typeParam

    const sorted = [...leaderboardFixture].sort((left, right) => {
      if (canonicalType === 'course') {
        return right.total_learning_point - left.total_learning_point
      }
      if (canonicalType === 'challenge') {
        return right.total_challenge_point - left.total_challenge_point
      }
      if (canonicalType === 'quiz') {
        return right.total_quiz_point - left.total_quiz_point
      }
      return right.total_points - left.total_points
    })

    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const pageOffset = safeOffset > 0 ? safeOffset : (safePage - 1) * safeLimit
    const completedFor = (entry: (typeof leaderboardFixture)[number]): number =>
      canonicalType === 'course'
        ? entry.course_completed
        : canonicalType === 'challenge'
          ? entry.challenge_completed
          : canonicalType === 'quiz'
            ? entry.quiz_completed
            : entry.course_completed + entry.challenge_completed + entry.quiz_completed

    const entries = sorted.slice(pageOffset, pageOffset + safeLimit).map((entry, index) => ({
      rank: pageOffset + index + 1,
      user: entry.user,
      score:
        canonicalType === 'course'
          ? entry.total_learning_point
          : canonicalType === 'challenge'
            ? entry.total_challenge_point
            : canonicalType === 'quiz'
              ? entry.total_quiz_point
              : entry.total_points,
      completed: completedFor(entry),
      delta: (() => {
        const nextEntry = sorted[pageOffset + index + 1]
        if (!nextEntry) {
          return 0
        }

        const currentScore =
          canonicalType === 'course'
            ? entry.total_learning_point
            : canonicalType === 'challenge'
              ? entry.total_challenge_point
              : canonicalType === 'quiz'
                ? entry.total_quiz_point
                : entry.total_points
        const nextScore =
          canonicalType === 'course'
            ? nextEntry.total_learning_point
            : canonicalType === 'challenge'
              ? nextEntry.total_challenge_point
              : canonicalType === 'quiz'
                ? nextEntry.total_quiz_point
                : nextEntry.total_points

        return Math.max(currentScore - nextScore, 0)
      })(),
    }))

    return HttpResponse.json({
      type: canonicalType,
      my_rank: 1,
      total_users: sorted.length,
      total_count: sorted.length,
      page: Math.floor(pageOffset / safeLimit) + 1,
      page_size: safeLimit,
      results: entries,
      entries,
    })
  }),
]
