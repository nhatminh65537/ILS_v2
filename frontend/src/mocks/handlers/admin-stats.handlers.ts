import { http, HttpResponse } from 'msw'
import { adminStatsOverviewFixture, adminStatsUserDetailFixture } from '@/mocks/data/fixtures'
import { notFound, parseNumericId } from '@/mocks/handlers/shared'

export const adminStatsHandlers = [
  // ─── GET /api/admin/stats/ — overview ────────────────────────────────────
  http.get('*/api/admin/stats/', () => {
    return HttpResponse.json(adminStatsOverviewFixture)
  }),

  // ─── GET /api/admin/stats/users/{id}/ — user detail ──────────────────────
  http.get('*/api/admin/stats/users/:userId/', ({ params }) => {
    const id = parseNumericId(String(params.userId))
    if (!id) return notFound('User not found')
    if (id !== adminStatsUserDetailFixture.user.id) return notFound('User not found')
    return HttpResponse.json(adminStatsUserDetailFixture)
  }),
]
