import { http, HttpResponse } from 'msw'
import { adminBroadcastHistoryFixture, notificationsFixture } from '@/mocks/data/fixtures'
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

  http.post('*/api/admin/notifications/broadcast/', async ({ request }) => {
    const payload = (await request.json()) as {
      type?: string
      title?: string
      message?: string
      metadata?: Record<string, unknown> | null
    }

    if (!payload.title?.trim() || !payload.message?.trim() || !payload.type?.trim()) {
      return HttpResponse.json(
        { detail: 'Invalid payload' },
        { status: 400 }
      )
    }

    const batchKey = `broadcast:msw-${Date.now()}`
    const sentAt = new Date().toISOString()

    adminBroadcastHistoryFixture.unshift({
      broadcast_batch_key: batchKey,
      type: payload.type,
      title: payload.title.trim(),
      message: payload.message.trim(),
      metadata: payload.metadata ?? null,
      recipient_count: 10,
      sent_at: sentAt,
      sender: {
        id: 1,
        username: 'member1',
        email: 'member1@ils.local',
      },
    })

    return HttpResponse.json(
      {
        message: 'Broadcast sent',
        recipient_count: 10,
        broadcast_batch_key: batchKey,
      },
      { status: 201 }
    )
  }),

  http.get('*/api/admin/notifications/history/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(adminBroadcastHistoryFixture, {
        limit,
        offset,
        basePath: '/api/admin/notifications/history/',
      })
    )
  }),
]
