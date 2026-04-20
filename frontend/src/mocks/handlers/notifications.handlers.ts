import { http, HttpResponse } from 'msw'
import { notificationsFixture } from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'

export const notificationsHandlers = [
  http.get('*/api/notifications/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    const pool = unreadOnly ? notificationsFixture.filter((item) => !item.is_read) : notificationsFixture

    return HttpResponse.json(
      toPaginatedResponse(pool, {
        limit,
        offset,
        basePath: '/api/notifications/',
      })
    )
  }),

  http.get('*/api/notifications/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Notification not found')
    }

    const notification = notificationsFixture.find((item) => item.id === id)
    if (!notification) {
      return notFound('Notification not found')
    }

    return HttpResponse.json(notification)
  }),

  http.post('*/api/notifications/:id/mark-read/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Notification not found')
    }

    const index = notificationsFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Notification not found')
    }

    const updated = {
      ...notificationsFixture[index],
      is_read: true,
      read_at: new Date().toISOString(),
    }

    notificationsFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.post('*/api/notifications/mark-all-read/', () => {
    const now = new Date().toISOString()
    let updatedCount = 0

    for (let index = 0; index < notificationsFixture.length; index += 1) {
      if (!notificationsFixture[index].is_read) {
        updatedCount += 1
      }

      notificationsFixture[index] = {
        ...notificationsFixture[index],
        is_read: true,
        read_at: now,
      }
    }

    return HttpResponse.json({ updated_count: updatedCount })
  }),

  http.get('*/api/notifications/unread-count/', () => {
    const count = notificationsFixture.filter((item) => !item.is_read).length
    return HttpResponse.json({ count })
  }),
]
