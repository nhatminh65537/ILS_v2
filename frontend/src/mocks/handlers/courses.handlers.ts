import { http, HttpResponse } from 'msw'
import {
  courseCategoriesFixture,
  courseNodesFixture,
  courseProgressFixture,
  coursesFixture,
} from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ContentStatus } from '@/types/course.types'

export const coursesHandlers = [
  http.get('*/api/courses/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(toPaginatedResponse(coursesFixture, { limit, offset, basePath: '/api/courses/' }))
  }),

  http.post('*/api/courses/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof coursesFixture)[number]>
    const now = new Date().toISOString()
    const nextId = coursesFixture.length + 1
    const created = {
      id: nextId,
      slug: payload.slug ?? `course-${nextId}`,
      title: payload.title ?? `Course ${nextId}`,
      description: payload.description,
      status: payload.status ?? ContentStatus.Draft,
      category_id: payload.category_id,
      learning_point: payload.learning_point ?? 0,
      coverage: payload.coverage,
      created_at: now,
      updated_at: now,
    }

    coursesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/courses/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const course = coursesFixture.find((item) => item.id === id)
    if (!course) {
      return notFound('Course not found')
    }

    const progress = courseProgressFixture.find((item) => item.course_id === id)
    return HttpResponse.json({
      ...course,
      user_progress: progress
        ? {
            completed: Math.round((progress.percent_complete / 100) * 10),
            total: 10,
            percent: progress.percent_complete,
          }
        : undefined,
    })
  }),

  http.patch('*/api/courses/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const index = coursesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Course not found')
    }

    const payload = (await request.json()) as Partial<(typeof coursesFixture)[number]>
    const updated = {
      ...coursesFixture[index],
      ...payload,
      updated_at: new Date().toISOString(),
    }

    coursesFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/courses/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const index = coursesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Course not found')
    }

    coursesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/courses/:id/tree/', ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const parent = new URL(request.url).searchParams.get('parent')
    const parentId = parent ? parseNumericId(parent) : null

    const nodes = courseNodesFixture.filter((item) => item.course_id === id)
    const filtered = parentId ? nodes.filter((item) => item.parent_id === parentId) : nodes

    return HttpResponse.json(filtered)
  }),

  http.get('*/api/courses/:id/progress/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const progress =
      courseProgressFixture.find((item) => item.course_id === id) ??
      {
        id: courseProgressFixture.length + 1,
        user_id: 1,
        course_id: id,
        started_at: new Date().toISOString(),
        completed_at: undefined,
        percent_complete: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

    return HttpResponse.json(progress)
  }),

  http.post('*/api/courses/:id/enroll/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course not found')
    }

    const now = new Date().toISOString()
    const enrollment = {
      id: courseProgressFixture.length + 1,
      user_id: 1,
      course_id: id,
      started_at: now,
      completed_at: undefined,
      percent_complete: 0,
      created_at: now,
      updated_at: now,
    }

    courseProgressFixture.push(enrollment)
    return HttpResponse.json(enrollment, { status: 201 })
  }),

  http.get('*/api/course-categories/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(courseCategoriesFixture, {
        limit,
        offset,
        basePath: '/api/course-categories/',
      })
    )
  }),

  http.post('*/api/course-categories/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof courseCategoriesFixture)[number]>
    const now = new Date().toISOString()
    const created = {
      id: courseCategoriesFixture.length + 1,
      name: payload.name ?? `Category ${courseCategoriesFixture.length + 1}`,
      description: payload.description,
      created_at: now,
      updated_at: now,
    }

    courseCategoriesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/course-categories/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course category not found')
    }

    const category = courseCategoriesFixture.find((item) => item.id === id)
    if (!category) {
      return notFound('Course category not found')
    }

    return HttpResponse.json(category)
  }),

  http.patch('*/api/course-categories/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course category not found')
    }

    const index = courseCategoriesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Course category not found')
    }

    const payload = (await request.json()) as Partial<(typeof courseCategoriesFixture)[number]>
    const updated = {
      ...courseCategoriesFixture[index],
      ...payload,
      updated_at: new Date().toISOString(),
    }

    courseCategoriesFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/course-categories/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Course category not found')
    }

    const index = courseCategoriesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Course category not found')
    }

    courseCategoriesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
