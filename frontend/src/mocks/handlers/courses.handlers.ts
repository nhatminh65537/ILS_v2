import { http, HttpResponse } from 'msw'
import {
  courseChildrenByParentIdFixture,
  courseCategoriesFixture,
  courseRootNodesFixture,
  courseTagsFixture,
  courseProgressFixture,
  coursesFixture,
} from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ContentStatus } from '@/types/course.types'

export const coursesHandlers = [
  http.get('*/api/learn/courses/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')

    const filteredCourses = coursesFixture
      .filter((course) => {
        if (!status || status === 'all') {
          return true
        }
        return course.status === status
      })
      .filter((course) => {
        if (!category) {
          return true
        }
        return course.category?.id === Number(category)
      })
      .filter((course) => {
        if (!search) {
          return true
        }
        return (
          course.title.toLowerCase().includes(search) ||
          (course.description ?? '').toLowerCase().includes(search)
        )
      })

    return HttpResponse.json(
      toPaginatedResponse(filteredCourses, { limit, offset, basePath: '/api/learn/courses/' })
    )
  }),

  http.post('*/api/learn/courses/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof coursesFixture)[number]>
    const now = new Date().toISOString()
    const nextId = coursesFixture.length + 1

    const selectedCategory =
      typeof payload.category === 'object' && payload.category !== null
        ? courseCategoriesFixture.find((item) => item.id === payload.category?.id) ?? null
        : null

    const created = {
      id: nextId,
      slug: payload.slug ?? `course-${nextId}`,
      title: payload.title ?? `Course ${nextId}`,
      description: payload.description,
      status: payload.status ?? ContentStatus.Draft,
      category: selectedCategory,
      tags: [],
      estimated_time: payload.estimated_time ?? 60,
      learning_point: payload.learning_point ?? 0,
      user_progress: { completed: 0, total: 0 },
      created_at: now,
      updated_at: now,
    }

    coursesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/learn/courses/:slug/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const course = coursesFixture.find((item) => item.slug === slug)
    if (!course) {
      return notFound('Course not found')
    }

    return HttpResponse.json(course)
  }),

  http.patch('*/api/learn/courses/:slug/', async ({ params, request }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const index = coursesFixture.findIndex((item) => item.slug === slug)
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

  http.delete('*/api/learn/courses/:slug/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const index = coursesFixture.findIndex((item) => item.slug === slug)
    if (index < 0) {
      return notFound('Course not found')
    }

    coursesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/learn/courses/:slug/progress/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const course = coursesFixture.find((item) => item.slug === slug)
    if (!course) {
      return notFound('Course not found')
    }

    return HttpResponse.json(
      courseProgressFixture[slug] ?? {
        lesson_count: 0,
        completed: 0,
        percent: '0.00',
      }
    )
  }),

  http.get('*/api/learn/courses/:slug/nodes/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const root = courseRootNodesFixture[slug]
    if (!root) {
      return notFound('Course not found')
    }

    return HttpResponse.json(root)
  }),

  http.get('*/api/learn/courses/:slug/nodes/:id/children/', ({ params }) => {
    const slug = String(params.slug)
    const nodeId = parseNumericId(String(params.id))
    if (!slug || !nodeId) {
      return notFound('Node not found')
    }

    if (!courseRootNodesFixture[slug]) {
      return notFound('Course not found')
    }

    return HttpResponse.json(courseChildrenByParentIdFixture[nodeId] ?? [])
  }),

  http.get('*/api/learn/categories/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(courseCategoriesFixture, {
        limit,
        offset,
        basePath: '/api/learn/categories/',
      })
    )
  }),

  http.get('*/api/learn/tags/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(courseTagsFixture, {
        limit,
        offset,
        basePath: '/api/learn/tags/',
      })
    )
  }),
]
