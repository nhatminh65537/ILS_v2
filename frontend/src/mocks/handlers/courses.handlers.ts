import { http, HttpResponse } from 'msw'
import {
  courseChildrenByParentIdFixture,
  courseCategoriesFixture,
  learnLessonProgressFixture,
  learnLessonQuestionsFixture,
  learnLessonsFixture,
  courseRootNodesFixture,
  courseTagsFixture,
  courseProgressFixture,
  coursesFixture,
  quizQuestionsFixture,
} from '@/mocks/data/fixtures'
import { badRequest, notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import {
  ContentStatus,
  LessonSource,
  LessonType,
  type Course,
  type CourseNode,
  type LessonSummary,
} from '@/types/course.types'

type CourseNodeLocation = {
  node: CourseNode
  siblings: CourseNode[]
  index: number
  parentId: number | null
  parentPath: string
}

const getCourseBySlug = (slug: string): Course | undefined => coursesFixture.find((item) => item.slug === slug)

const getNextCourseId = (): number => Math.max(0, ...coursesFixture.map((course) => course.id)) + 1

const getNextCategoryId = (): number => Math.max(0, ...courseCategoriesFixture.map((category) => category.id)) + 1

const getNextTagId = (): number => Math.max(0, ...courseTagsFixture.map((tag) => tag.id)) + 1

const getNextNodeId = (): number => {
  const allNodes: CourseNode[] = []
  Object.values(courseRootNodesFixture).forEach((nodes) => allNodes.push(...nodes))
  Object.values(courseChildrenByParentIdFixture).forEach((nodes) => allNodes.push(...nodes))
  return Math.max(0, ...allNodes.map((node) => node.id)) + 1
}

const getNextLessonId = (): number =>
  Math.max(0, ...Object.keys(learnLessonsFixture).map((id) => Number(id))) + 1

const getNextMappingId = (): number => {
  const mappings = Object.values(learnLessonQuestionsFixture).flat()
  return Math.max(0, ...mappings.map((mapping) => mapping.id)) + 1
}

const sortNodes = (nodes: CourseNode[]): CourseNode[] =>
  [...nodes].sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))

const findNodeLocation = (slug: string, nodeId: number): CourseNodeLocation | null => {
  const roots = courseRootNodesFixture[slug] ?? []

  const walk = (siblings: CourseNode[], parentId: number | null, parentPath: string): CourseNodeLocation | null => {
    for (let index = 0; index < siblings.length; index += 1) {
      const node = siblings[index]
      if (node.id === nodeId) {
        return { node, siblings, index, parentId, parentPath }
      }

      if (node.is_item) {
        continue
      }

      const children = courseChildrenByParentIdFixture[node.id] ?? []
      const found = walk(children, node.id, node.path)
      if (found) {
        return found
      }
    }

    return null
  }

  return walk(roots, null, '')
}

const getParentPath = (slug: string, parentId: number | null): string => {
  if (parentId == null) {
    return ''
  }

  const parentLocation = findNodeLocation(slug, parentId)
  return parentLocation?.node.path ?? ''
}

const rebuildSiblingState = (siblings: CourseNode[], parentPath: string): void => {
  siblings
    .sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))
    .forEach((node, index) => {
      const position = index + 1
      const path = parentPath ? `${parentPath}.${position}` : `${position}`
      const children = courseChildrenByParentIdFixture[node.id] ?? []
      const nextNode: CourseNode = {
        ...node,
        position,
        path,
        has_children: children.length > 0,
      }
      siblings[index] = nextNode

      if (!nextNode.is_item && children.length > 0) {
        rebuildSiblingState(children, path)
      }
    })
}

const isDescendantOf = (slug: string, nodeId: number, ancestorId: number): boolean => {
  let current = findNodeLocation(slug, nodeId)
  while (current?.parentId != null) {
    if (current.parentId === ancestorId) {
      return true
    }
    current = findNodeLocation(slug, current.parentId)
  }
  return false
}

const applyCoursePayload = (course: Course, payload: Record<string, unknown>): Course => {
  const categoryId =
    payload.category_id != null
      ? Number(payload.category_id)
      : typeof payload.category === 'object' && payload.category != null && 'id' in payload.category
        ? Number((payload.category as { id: number }).id)
        : undefined

  const selectedCategory =
    categoryId == null || Number.isNaN(categoryId)
      ? course.category ?? null
      : courseCategoriesFixture.find((item) => item.id === categoryId) ?? null

  const tagIds = Array.isArray(payload.tag_ids)
    ? payload.tag_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : null

  const selectedTags = tagIds == null
    ? [...course.tags]
    : courseTagsFixture.filter((tag) => tagIds.includes(tag.id))

  return {
    ...course,
    title: typeof payload.title === 'string' ? payload.title : course.title,
    slug: typeof payload.slug === 'string' && payload.slug.trim() ? payload.slug.trim() : course.slug,
    description: typeof payload.description === 'string' ? payload.description : course.description,
    status: typeof payload.status === 'string' ? payload.status as ContentStatus : course.status,
    category: selectedCategory,
    tags: selectedTags,
    learning_point:
      typeof payload.learning_point === 'number'
        ? payload.learning_point
        : course.learning_point,
    estimated_time:
      typeof payload.estimated_time === 'number'
        ? payload.estimated_time
        : course.estimated_time,
    updated_at: new Date().toISOString(),
  }
}

const insertNodeAt = (siblings: CourseNode[], node: CourseNode, targetPosition?: number): void => {
  const clampedPosition = Math.max(1, Math.min(targetPosition ?? siblings.length + 1, siblings.length + 1))
  const index = clampedPosition - 1
  siblings.splice(index, 0, node)
}

const deleteNodeSubtree = (node: CourseNode): void => {
  if (node.is_item && node.lesson) {
    delete learnLessonsFixture[node.lesson.id]
    delete learnLessonQuestionsFixture[node.lesson.id]
    delete learnLessonProgressFixture[node.lesson.id]
    return
  }

  const children = [...(courseChildrenByParentIdFixture[node.id] ?? [])]
  children.forEach((child) => deleteNodeSubtree(child))
  delete courseChildrenByParentIdFixture[node.id]
}

const replaceNodeInPlace = (location: CourseNodeLocation, node: CourseNode): void => {
  location.siblings[location.index] = node
}

const syncLessonSummaryAcrossTree = (lessonId: number): void => {
  const detail = learnLessonsFixture[lessonId]
  if (!detail) {
    return
  }

  const rewriteArray = (nodes: CourseNode[]): void => {
    nodes.forEach((node, index) => {
      if (node.is_item && node.lesson?.id === lessonId) {
        const nextLesson: LessonSummary = {
          ...node.lesson,
          title: detail.title,
          lesson_type: detail.lesson_type,
          source: detail.source,
          video_url: detail.video_url ?? null,
          video_duration: detail.video_duration ?? null,
          learning_point: detail.learning_point,
          learning_time: detail.learning_time ?? null,
        }
        nodes[index] = { ...node, lesson: nextLesson }
      }

      if (!node.is_item) {
        const children = courseChildrenByParentIdFixture[node.id] ?? []
        rewriteArray(children)
      }
    })
  }

  Object.values(courseRootNodesFixture).forEach((roots) => rewriteArray(roots))
}

const sortMappings = (lessonId: number): void => {
  const mappings = learnLessonQuestionsFixture[lessonId] ?? []
  const ordered = [...mappings]
    .sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))
    .map((mapping, index) => ({ ...mapping, position: index }))
  learnLessonQuestionsFixture[lessonId] = ordered
}

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
    const payload = (await request.json()) as Record<string, unknown>
    const now = new Date().toISOString()
    const nextId = getNextCourseId()

    const slugRaw = typeof payload.slug === 'string' ? payload.slug.trim() : `course-${nextId}`
    if (coursesFixture.some((course) => course.slug === slugRaw)) {
      return badRequest('slug already exists')
    }

    const categoryId = payload.category_id != null ? Number(payload.category_id) : null
    const selectedCategory =
      categoryId == null || Number.isNaN(categoryId)
        ? null
        : courseCategoriesFixture.find((item) => item.id === categoryId) ?? null

    const tagIds = Array.isArray(payload.tag_ids)
      ? payload.tag_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : []
    const selectedTags = courseTagsFixture.filter((tag) => tagIds.includes(tag.id))

    const status = typeof payload.status === 'string' ? payload.status as ContentStatus : ContentStatus.Draft

    const created = {
      id: nextId,
      slug: slugRaw,
      title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : `Course ${nextId}`,
      description: typeof payload.description === 'string' ? payload.description : '',
      status,
      category: selectedCategory,
      tags: selectedTags,
      estimated_time: typeof payload.estimated_time === 'number' ? payload.estimated_time : 60,
      learning_point: typeof payload.learning_point === 'number' ? payload.learning_point : 0,
      user_progress: { completed: 0, total: 0 },
      created_at: now,
      updated_at: now,
    }

    coursesFixture.push(created)
    courseRootNodesFixture[created.slug] = []
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/learn/courses/:slug/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const course = getCourseBySlug(slug)
    if (!course) {
      return notFound('Course not found')
    }

    return HttpResponse.json(course)
  }),

  http.put('*/api/learn/courses/:slug/', async ({ params, request }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const index = coursesFixture.findIndex((item) => item.slug === slug)
    if (index < 0) {
      return notFound('Course not found')
    }

    const payload = (await request.json()) as Record<string, unknown>
    const nextSlug = typeof payload.slug === 'string' ? payload.slug.trim() : null
    if (nextSlug && nextSlug !== slug && coursesFixture.some((course) => course.slug === nextSlug)) {
      return badRequest('slug already exists')
    }

    const updated = applyCoursePayload(coursesFixture[index], payload)
    const previousSlug = coursesFixture[index].slug

    coursesFixture[index] = updated

    if (previousSlug !== updated.slug) {
      const rootNodes = courseRootNodesFixture[previousSlug] ?? []
      courseRootNodesFixture[updated.slug] = rootNodes
      delete courseRootNodesFixture[previousSlug]

      if (courseProgressFixture[previousSlug]) {
        courseProgressFixture[updated.slug] = courseProgressFixture[previousSlug]
        delete courseProgressFixture[previousSlug]
      }
    }

    return HttpResponse.json(updated)
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

    const payload = (await request.json()) as Record<string, unknown>
    const nextSlug = typeof payload.slug === 'string' ? payload.slug.trim() : null
    if (nextSlug && nextSlug !== slug && coursesFixture.some((course) => course.slug === nextSlug)) {
      return badRequest('slug already exists')
    }

    const updated = applyCoursePayload(coursesFixture[index], payload)
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
    delete courseRootNodesFixture[slug]
    delete courseProgressFixture[slug]
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/learn/courses/:slug/progress/', ({ params }) => {
    const slug = String(params.slug)
    if (!slug) {
      return notFound('Course not found')
    }

    const course = getCourseBySlug(slug)
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

    return HttpResponse.json(sortNodes(root))
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

    return HttpResponse.json(sortNodes(courseChildrenByParentIdFixture[nodeId] ?? []))
  }),

  http.post('*/api/learn/courses/:slug/nodes/', async ({ params, request }) => {
    const slug = String(params.slug)
    if (!slug || !courseRootNodesFixture[slug]) {
      return notFound('Course not found')
    }

    const payload = (await request.json()) as {
      title?: string
      parent_id?: number | null
      position?: number
      is_item?: boolean
      lesson?: {
        title?: string
        lesson_type?: LessonType
        source?: LessonSource
        content_md?: string | null
        video_url?: string | null
        video_duration?: number | null
        learning_point?: number
        learning_time?: number | null
      }
    }

    if (!payload.title?.trim()) {
      return badRequest('title is required')
    }

    const parentId = payload.parent_id == null ? null : Number(payload.parent_id)
    if (parentId != null && Number.isNaN(parentId)) {
      return badRequest('parent_id is invalid')
    }

    let parentPath = ''
    let siblings = courseRootNodesFixture[slug]

    if (parentId != null) {
      const parentLocation = findNodeLocation(slug, parentId)
      if (!parentLocation) {
        return notFound('Parent node not found')
      }
      if (parentLocation.node.is_item) {
        return badRequest('Cannot add child under lesson node')
      }

      parentPath = parentLocation.node.path
      if (!courseChildrenByParentIdFixture[parentId]) {
        courseChildrenByParentIdFixture[parentId] = []
      }
      siblings = courseChildrenByParentIdFixture[parentId]
    }

    const nodeId = getNextNodeId()
    let lesson: LessonSummary | null = null

    if (payload.is_item) {
      const lessonId = getNextLessonId()
      const lessonType = payload.lesson?.lesson_type ?? LessonType.Markdown
      const lessonTitle = payload.lesson?.title?.trim() || payload.title.trim()
      const lessonDetail = {
        id: lessonId,
        title: lessonTitle,
        lesson_type: lessonType,
        source: payload.lesson?.source ?? LessonSource.Manual,
        content_md: lessonType === LessonType.Markdown ? payload.lesson?.content_md ?? '' : null,
        video_url: lessonType === LessonType.Video ? payload.lesson?.video_url ?? '' : null,
        video_duration: payload.lesson?.video_duration ?? null,
        learning_point: payload.lesson?.learning_point ?? 0,
        learning_time: payload.lesson?.learning_time ?? null,
      }

      learnLessonsFixture[lessonId] = lessonDetail
      lesson = {
        id: lessonDetail.id,
        title: lessonDetail.title,
        lesson_type: lessonDetail.lesson_type,
        source: lessonDetail.source,
        video_url: lessonDetail.video_url,
        video_duration: lessonDetail.video_duration,
        learning_point: lessonDetail.learning_point,
        learning_time: lessonDetail.learning_time,
      }
    }

    const created: CourseNode = {
      id: nodeId,
      parent: parentId,
      is_item: Boolean(payload.is_item),
      title: payload.title.trim(),
      position: 1,
      path: parentPath ? `${parentPath}.1` : '1',
      has_children: false,
      lesson,
    }

    insertNodeAt(siblings, created, payload.position)
    rebuildSiblingState(siblings, parentPath)

    if (parentId != null) {
      const parentLocation = findNodeLocation(slug, parentId)
      if (parentLocation) {
        replaceNodeInPlace(parentLocation, { ...parentLocation.node, has_children: true })
      }
    }

    const createdLocation = findNodeLocation(slug, nodeId)
    return HttpResponse.json(createdLocation?.node ?? created, { status: 201 })
  }),

  http.put('*/api/learn/courses/:slug/nodes/:id/', async ({ params, request }) => {
    const slug = String(params.slug)
    const nodeId = parseNumericId(String(params.id))
    if (!slug || !nodeId || !courseRootNodesFixture[slug]) {
      return notFound('Node not found')
    }

    const payload = (await request.json()) as {
      title?: string
      parent_id?: number | null
      position?: number
    }

    const location = findNodeLocation(slug, nodeId)
    if (!location) {
      return notFound('Node not found')
    }

    const nextParentId =
      payload.parent_id === undefined
        ? location.parentId
        : payload.parent_id == null
          ? null
          : Number(payload.parent_id)

    if (nextParentId != null && Number.isNaN(nextParentId)) {
      return badRequest('parent_id is invalid')
    }

    if (nextParentId != null) {
      const targetParent = findNodeLocation(slug, nextParentId)
      if (!targetParent) {
        return notFound('Parent node not found')
      }
      if (targetParent.node.is_item) {
        return badRequest('Cannot move under lesson node')
      }
      if (nextParentId === nodeId || isDescendantOf(slug, nextParentId, nodeId)) {
        return badRequest('Cannot move node into its own subtree')
      }
    }

    let workingNode: CourseNode = {
      ...location.node,
      title: payload.title?.trim() ? payload.title.trim() : location.node.title,
    }

    const parentChanged = nextParentId !== location.parentId
    if (parentChanged) {
      location.siblings.splice(location.index, 1)
      rebuildSiblingState(location.siblings, location.parentPath)

      if (location.parentId != null) {
        const oldParent = findNodeLocation(slug, location.parentId)
        if (oldParent) {
          const oldChildren = courseChildrenByParentIdFixture[location.parentId] ?? []
          replaceNodeInPlace(oldParent, { ...oldParent.node, has_children: oldChildren.length > 0 })
        }
      }

      const targetSiblings = nextParentId == null
        ? courseRootNodesFixture[slug]
        : (courseChildrenByParentIdFixture[nextParentId] ??= [])
      const targetParentPath = getParentPath(slug, nextParentId)

      workingNode = { ...workingNode, parent: nextParentId }
      insertNodeAt(targetSiblings, workingNode, payload.position)
      rebuildSiblingState(targetSiblings, targetParentPath)

      if (nextParentId != null) {
        const nextParent = findNodeLocation(slug, nextParentId)
        if (nextParent) {
          replaceNodeInPlace(nextParent, { ...nextParent.node, has_children: true })
        }
      }
    } else {
      replaceNodeInPlace(location, workingNode)

      if (payload.position != null) {
        location.siblings.splice(location.index, 1)
        insertNodeAt(location.siblings, workingNode, payload.position)
      }
      rebuildSiblingState(location.siblings, location.parentPath)
    }

    const updatedLocation = findNodeLocation(slug, nodeId)
    if (!updatedLocation) {
      return notFound('Node not found')
    }

    return HttpResponse.json(updatedLocation.node)
  }),

  http.delete('*/api/learn/courses/:slug/nodes/:id/', ({ params }) => {
    const slug = String(params.slug)
    const nodeId = parseNumericId(String(params.id))
    if (!slug || !nodeId || !courseRootNodesFixture[slug]) {
      return notFound('Node not found')
    }

    const location = findNodeLocation(slug, nodeId)
    if (!location) {
      return notFound('Node not found')
    }

    deleteNodeSubtree(location.node)

    location.siblings.splice(location.index, 1)
    rebuildSiblingState(location.siblings, location.parentPath)

    if (location.parentId != null) {
      const parentLocation = findNodeLocation(slug, location.parentId)
      if (parentLocation) {
        const remaining = courseChildrenByParentIdFixture[location.parentId] ?? []
        replaceNodeInPlace(parentLocation, { ...parentLocation.node, has_children: remaining.length > 0 })
      }
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/learn/lessons/:id/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    const lesson = learnLessonsFixture[lessonId]
    if (!lesson) {
      return notFound('Lesson not found')
    }

    return HttpResponse.json(lesson)
  }),

  http.put('*/api/learn/lessons/:id/', async ({ params, request }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    const lesson = learnLessonsFixture[lessonId]
    if (!lesson) {
      return notFound('Lesson not found')
    }

    const payload = (await request.json()) as {
      title?: string
      content_md?: string
      video_url?: string | null
      video_duration?: number | null
      learning_point?: number
      learning_time?: number | null
    }

    const updated = {
      ...lesson,
      title: payload.title?.trim() ? payload.title.trim() : lesson.title,
      content_md: payload.content_md !== undefined ? payload.content_md : lesson.content_md,
      video_url: payload.video_url !== undefined ? payload.video_url : lesson.video_url,
      video_duration: payload.video_duration !== undefined ? payload.video_duration : lesson.video_duration,
      learning_point:
        typeof payload.learning_point === 'number' ? payload.learning_point : lesson.learning_point,
      learning_time:
        payload.learning_time !== undefined ? payload.learning_time : lesson.learning_time,
    }

    learnLessonsFixture[lessonId] = updated
    syncLessonSummaryAcrossTree(lessonId)
    return HttpResponse.json(updated)
  }),

  http.get('*/api/learn/lessons/:id/questions/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    const lesson = learnLessonsFixture[lessonId]
    if (!lesson) {
      return notFound('Lesson not found')
    }

    if (lesson.lesson_type !== LessonType.MiniQuiz) {
      return badRequest('Lesson is not miniquiz type')
    }

    sortMappings(lessonId)
    return HttpResponse.json(learnLessonQuestionsFixture[lessonId] ?? [])
  }),

  http.get('*/api/learn/lessons/:id/questions/:qid/reveal/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    const questionId = parseNumericId(String(params.qid))
    if (!lessonId || !questionId) {
      return notFound('Question not found')
    }

    const lesson = learnLessonsFixture[lessonId]
    if (!lesson) {
      return notFound('Lesson not found')
    }
    if (lesson.lesson_type !== LessonType.MiniQuiz) {
      return badRequest('Lesson is not miniquiz type')
    }

    const question = quizQuestionsFixture.find((q) => q.id === questionId)
    if (!question) {
      return notFound('Question not found in this lesson')
    }

    const correct = (question.options ?? []).filter((o) => o.is_correct)
    return HttpResponse.json({
      question_id: question.id,
      question_type: question.question_type,
      explanation: question.explanation ?? '',
      correct_option_ids: correct.map((o) => o.id),
      correct_options: correct.map((o) => ({ id: o.id, content: o.content })),
      accepted_answers: [],
    })
  }),

  http.post('*/api/learn/lessons/:id/questions/', async ({ params, request }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    const lesson = learnLessonsFixture[lessonId]
    if (!lesson) {
      return notFound('Lesson not found')
    }

    if (lesson.lesson_type !== LessonType.MiniQuiz) {
      return badRequest('Lesson is not miniquiz type')
    }

    const payload = (await request.json()) as { question_id?: number; position?: number }
    const questionId = payload.question_id != null ? Number(payload.question_id) : null
    if (!questionId || Number.isNaN(questionId)) {
      return badRequest('question_id is required')
    }

    const question = quizQuestionsFixture.find((item) => item.id === questionId)
    if (!question) {
      return notFound('Question not found')
    }

    const existing = learnLessonQuestionsFixture[lessonId] ?? []
    if (existing.some((mapping) => mapping.question.id === questionId)) {
      return badRequest('Question already attached')
    }

    const created = {
      id: getNextMappingId(),
      lesson: lessonId,
      position: 0,
      question: {
        id: question.id,
        question_type: question.question_type,
        content: question.content,
        explanation: question.explanation,
        score: question.score,
        position: question.position,
        options: question.options?.map((option) => ({
          id: option.id,
          content: option.content,
          position: option.position,
        })),
      },
    }

    const next = [...existing]
    const position = Math.max(0, Math.min(payload.position ?? next.length, next.length))
    next.splice(position, 0, created)
    learnLessonQuestionsFixture[lessonId] = next.map((mapping, index) => ({
      ...mapping,
      position: index,
    }))

    return HttpResponse.json(
      learnLessonQuestionsFixture[lessonId].find((mapping) => mapping.id === created.id),
      { status: 201 }
    )
  }),

  http.put('*/api/learn/lesson-questions/:id/', async ({ params, request }) => {
    const mappingId = parseNumericId(String(params.id))
    if (!mappingId) {
      return notFound('Lesson question mapping not found')
    }

    const payload = (await request.json()) as { position?: number }
    const targetPosition = typeof payload.position === 'number' ? payload.position : null
    if (targetPosition == null) {
      return badRequest('position is required')
    }

    const lessonId = Object.keys(learnLessonQuestionsFixture)
      .map((id) => Number(id))
      .find((id) => (learnLessonQuestionsFixture[id] ?? []).some((mapping) => mapping.id === mappingId))

    if (!lessonId) {
      return notFound('Lesson question mapping not found')
    }

    const mappings = [...(learnLessonQuestionsFixture[lessonId] ?? [])]
    const currentIndex = mappings.findIndex((mapping) => mapping.id === mappingId)
    if (currentIndex < 0) {
      return notFound('Lesson question mapping not found')
    }

    const [current] = mappings.splice(currentIndex, 1)
    const clamped = Math.max(0, Math.min(targetPosition, mappings.length))
    mappings.splice(clamped, 0, current)
    learnLessonQuestionsFixture[lessonId] = mappings.map((mapping, index) => ({ ...mapping, position: index }))

    const updated = learnLessonQuestionsFixture[lessonId].find((mapping) => mapping.id === mappingId)
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/learn/lesson-questions/:id/', ({ params }) => {
    const mappingId = parseNumericId(String(params.id))
    if (!mappingId) {
      return notFound('Lesson question mapping not found')
    }

    const lessonId = Object.keys(learnLessonQuestionsFixture)
      .map((id) => Number(id))
      .find((id) => (learnLessonQuestionsFixture[id] ?? []).some((mapping) => mapping.id === mappingId))

    if (!lessonId) {
      return notFound('Lesson question mapping not found')
    }

    const mappings = [...(learnLessonQuestionsFixture[lessonId] ?? [])]
    const index = mappings.findIndex((mapping) => mapping.id === mappingId)
    if (index < 0) {
      return notFound('Lesson question mapping not found')
    }

    mappings.splice(index, 1)
    learnLessonQuestionsFixture[lessonId] = mappings.map((mapping, order) => ({ ...mapping, position: order }))
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/learn/lessons/:id/progress/start/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    if (!learnLessonsFixture[lessonId]) {
      return notFound('Lesson not found')
    }

    const now = new Date().toISOString()
    const existing = learnLessonProgressFixture[lessonId]
    const nextProgress = {
      id: existing?.id ?? 10000 + lessonId,
      user: 1,
      lesson: lessonId,
      started_at: existing?.started_at ?? now,
      completed_at: existing?.completed_at ?? null,
      is_completed: existing?.is_completed ?? false,
    }

    learnLessonProgressFixture[lessonId] = nextProgress
    return HttpResponse.json(nextProgress)
  }),

  http.post('*/api/learn/lessons/:id/progress/complete/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId) {
      return notFound('Lesson not found')
    }

    if (!learnLessonsFixture[lessonId]) {
      return notFound('Lesson not found')
    }

    const now = new Date().toISOString()
    const existing = learnLessonProgressFixture[lessonId]
    const nextProgress = {
      id: existing?.id ?? 10000 + lessonId,
      user: 1,
      lesson: lessonId,
      started_at: existing?.started_at ?? now,
      completed_at: existing?.completed_at ?? now,
      is_completed: true,
    }

    learnLessonProgressFixture[lessonId] = nextProgress
    return HttpResponse.json(nextProgress)
  }),

  // ── Outline sync (Task 5.8) ────────────────────────────────────────────────
  http.get('*/api/learn/outline/collections/', () =>
    HttpResponse.json({
      items: [
        { id: 'col-training', name: '1. Training' },
        { id: 'col-overview', name: '0. Overview' },
      ],
      total: 2,
      offset: 0,
      limit: 25,
    })
  ),

  http.get('*/api/learn/outline/documents/', ({ request }) => {
    const url = new URL(request.url)
    const collectionId = url.searchParams.get('collection_id') ?? 'col-training'
    const items = [
      {
        id: `${collectionId}-doc-1`,
        title: 'Forensics 101',
        url: 'https://collab.example.org/doc/forensics-101',
        revision: 4,
        updated_at: new Date().toISOString(),
        collection_id: collectionId,
      },
      {
        id: `${collectionId}-doc-2`,
        title: 'Tools Cheatsheet',
        url: 'https://collab.example.org/doc/tools-cheatsheet',
        revision: 13,
        updated_at: new Date().toISOString(),
        collection_id: collectionId,
      },
    ]
    return HttpResponse.json({ items, total: items.length, offset: 0, limit: 25 })
  }),

  http.post('*/api/learn/lessons/:id/outline/', async ({ params, request }) => {
    const lessonId = parseNumericId(String(params.id))
    if (!lessonId || !learnLessonsFixture[lessonId]) {
      return notFound('Lesson not found')
    }
    const payload = (await request.json()) as { outline_doc_id?: string }
    const docId = payload.outline_doc_id ?? 'doc-1'
    const updated = {
      ...learnLessonsFixture[lessonId],
      source: LessonSource.Outline,
      content_md: `# Imported from Outline\n\nDocument ${docId} content (mock).`,
      outline_info: {
        outline_doc_id: docId,
        outline_url: `https://collab.example.org/doc/${docId}`,
        last_synced_at: new Date().toISOString(),
        revision: 4,
      },
    }
    learnLessonsFixture[lessonId] = updated
    return HttpResponse.json(updated)
  }),

  http.post('*/api/learn/lessons/:id/sync-outline/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    const lesson = lessonId ? learnLessonsFixture[lessonId] : undefined
    if (!lesson) {
      return notFound('Lesson not found')
    }
    if (!lesson.outline_info) {
      return badRequest('Lesson is not linked to Outline.')
    }
    const updated = {
      ...lesson,
      content_md: `${lesson.content_md ?? ''}\n\n_synced ${new Date().toISOString()}_`,
      outline_info: {
        ...lesson.outline_info,
        last_synced_at: new Date().toISOString(),
        revision: (lesson.outline_info.revision ?? 0) + 1,
      },
    }
    learnLessonsFixture[lessonId as number] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/learn/lessons/:id/outline/', ({ params }) => {
    const lessonId = parseNumericId(String(params.id))
    const lesson = lessonId ? learnLessonsFixture[lessonId] : undefined
    if (!lesson) {
      return notFound('Lesson not found')
    }
    const updated = { ...lesson, source: LessonSource.Manual, outline_info: null }
    learnLessonsFixture[lessonId as number] = updated
    return HttpResponse.json(updated)
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

  http.post('*/api/learn/categories/', async ({ request }) => {
    const payload = (await request.json()) as { name?: string; description?: string }
    const name = payload.name?.trim()
    if (!name) {
      return badRequest('name is required')
    }

    const created = {
      id: getNextCategoryId(),
      name,
      description: payload.description?.trim() || '',
    }
    courseCategoriesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/api/learn/categories/:id/', async ({ params, request }) => {
    const categoryId = parseNumericId(String(params.id))
    if (!categoryId) {
      return notFound('Category not found')
    }

    const index = courseCategoriesFixture.findIndex((category) => category.id === categoryId)
    if (index < 0) {
      return notFound('Category not found')
    }

    const payload = (await request.json()) as { name?: string; description?: string }
    const updated = {
      ...courseCategoriesFixture[index],
      name: payload.name?.trim() || courseCategoriesFixture[index].name,
      description:
        payload.description !== undefined
          ? payload.description.trim()
          : courseCategoriesFixture[index].description,
    }
    courseCategoriesFixture[index] = updated

    coursesFixture.forEach((course, courseIndex) => {
      if (course.category?.id === categoryId) {
        coursesFixture[courseIndex] = {
          ...course,
          category: updated,
        }
      }
    })

    return HttpResponse.json(updated)
  }),

  http.delete('*/api/learn/categories/:id/', ({ params }) => {
    const categoryId = parseNumericId(String(params.id))
    if (!categoryId) {
      return notFound('Category not found')
    }

    const index = courseCategoriesFixture.findIndex((category) => category.id === categoryId)
    if (index < 0) {
      return notFound('Category not found')
    }

    courseCategoriesFixture.splice(index, 1)
    coursesFixture.forEach((course, courseIndex) => {
      if (course.category?.id === categoryId) {
        coursesFixture[courseIndex] = {
          ...course,
          category: null,
        }
      }
    })

    return new HttpResponse(null, { status: 204 })
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

  http.post('*/api/learn/tags/', async ({ request }) => {
    const payload = (await request.json()) as { name?: string; description?: string }
    const name = payload.name?.trim()
    if (!name) {
      return badRequest('name is required')
    }

    const created = {
      id: getNextTagId(),
      name,
      description: payload.description?.trim() || '',
    }
    courseTagsFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/api/learn/tags/:id/', async ({ params, request }) => {
    const tagId = parseNumericId(String(params.id))
    if (!tagId) {
      return notFound('Tag not found')
    }

    const index = courseTagsFixture.findIndex((tag) => tag.id === tagId)
    if (index < 0) {
      return notFound('Tag not found')
    }

    const payload = (await request.json()) as { name?: string; description?: string }
    const updated = {
      ...courseTagsFixture[index],
      name: payload.name?.trim() || courseTagsFixture[index].name,
      description:
        payload.description !== undefined
          ? payload.description.trim()
          : courseTagsFixture[index].description,
    }
    courseTagsFixture[index] = updated

    coursesFixture.forEach((course, courseIndex) => {
      const hasTag = course.tags.some((tag) => tag.id === tagId)
      if (!hasTag) {
        return
      }

      coursesFixture[courseIndex] = {
        ...course,
        tags: course.tags.map((tag) => (tag.id === tagId ? updated : tag)),
      }
    })

    return HttpResponse.json(updated)
  }),

  http.delete('*/api/learn/tags/:id/', ({ params }) => {
    const tagId = parseNumericId(String(params.id))
    if (!tagId) {
      return notFound('Tag not found')
    }

    const index = courseTagsFixture.findIndex((tag) => tag.id === tagId)
    if (index < 0) {
      return notFound('Tag not found')
    }

    courseTagsFixture.splice(index, 1)
    coursesFixture.forEach((course, courseIndex) => {
      coursesFixture[courseIndex] = {
        ...course,
        tags: course.tags.filter((tag) => tag.id !== tagId),
      }
    })

    return new HttpResponse(null, { status: 204 })
  }),
]
