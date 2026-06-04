import { http, HttpResponse } from 'msw'
import {
  quizCategoriesFixture,
  quizNodesFixture,
  quizProgressFixture,
  quizQuestionsFixture,
  quizTagsFixture,
  quizzesFixture,
} from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ContentStatus, QuestionType, type QuizNode } from '@/types/quiz.types'

const sortFolderFirst = (a: QuizNode, b: QuizNode): number => {
  if (a.is_item !== b.is_item) {
    return a.is_item ? 1 : -1
  }
  const byTitle = a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  return byTitle !== 0 ? byTitle : a.id - b.id
}

/** Build the explorer response (folders + visible quiz items + breadcrumb) for a folder. */
const buildQuizExplorerResponse = (folder: QuizNode | null) => {
  const parentId = folder?.id ?? null
  const solvedIds = new Set(quizProgressFixture.filter((p) => p.best_score > 0).map((p) => p.quiz_id))

  const nodes = quizNodesFixture
    .filter((n) => (n.parent ?? null) === parentId)
    .sort(sortFolderFirst)
    .map((node) => {
      if (!node.is_item || node.quiz == null) {
        return { id: node.id, is_item: node.is_item, title: node.title, path: node.path, quiz: null }
      }
      const quiz = quizzesFixture.find((q) => q.id === node.quiz)
      return {
        id: node.id,
        is_item: node.is_item,
        title: node.title,
        path: node.path,
        quiz: quiz
          ? {
              id: quiz.id,
              title: quiz.title,
              status: quiz.status,
              quiz_point: quiz.quiz_point,
              total_questions: quiz.total_questions,
              time_limit_sec: quiz.time_limit_sec ?? null,
              category_name: quiz.category_name ?? null,
              tags: quiz.tags ?? [],
              is_solved: solvedIds.has(quiz.id),
            }
          : null,
      }
    })
    // Members only see published items; drafts are hidden in the explorer.
    .filter((n) => !n.is_item || (n.quiz && n.quiz.status === 'published'))

  const breadcrumb: { id: number; title: string }[] = []
  if (folder) {
    const ancestorIds = folder.path ? folder.path.split('.').map(Number) : []
    for (const aid of ancestorIds) {
      const anc = quizNodesFixture.find((n) => n.id === aid)
      if (anc) breadcrumb.push({ id: anc.id, title: anc.title })
    }
    breadcrumb.push({ id: folder.id, title: folder.title })
  }

  return {
    folder: folder ? { id: folder.id, title: folder.title, path: folder.path } : null,
    breadcrumb,
    nodes,
  }
}

export const quizzesHandlers = [
  http.get('*/api/quiz/quizzes/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const status = url.searchParams.get('status')
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
    const category = url.searchParams.get('category')
    const tagsParam = url.searchParams.get('tags')
    const solved = url.searchParams.get('solved')

    const tagIds = (tagsParam ?? '')
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isFinite(id) && id > 0)
    const solvedIds = new Set(quizProgressFixture.filter((p) => p.best_score > 0).map((p) => p.quiz_id))

    const filteredQuizzes = quizzesFixture
      .filter((quiz) => {
        if (!status || status === 'all') {
          return true
        }
        return quiz.status === status
      })
      .filter((quiz) => {
        if (!search) {
          return true
        }
        return (
          quiz.title.toLowerCase().includes(search) ||
          (quiz.description ?? '').toLowerCase().includes(search)
        )
      })
      .filter((quiz) => {
        if (!category) {
          return true
        }
        const categoryId = typeof quiz.category === 'number' ? quiz.category : quiz.category?.id
        return categoryId === Number(category)
      })
      .filter((quiz) => {
        if (tagIds.length === 0) {
          return true
        }
        const quizTagIds = new Set((quiz.tags ?? []).map((tag) => tag.id))
        return tagIds.every((id) => quizTagIds.has(id))
      })
      .filter((quiz) => {
        if (solved !== 'true' && solved !== 'false') {
          return true
        }
        const isSolved = solvedIds.has(quiz.id)
        return solved === 'true' ? isSolved : !isSolved
      })
      .map((quiz) => ({ ...quiz, is_solved: solvedIds.has(quiz.id) }))

    return HttpResponse.json(
      toPaginatedResponse(filteredQuizzes, {
        limit,
        offset,
        basePath: '/api/quiz/quizzes/',
      })
    )
  }),

  http.post('*/api/quiz/quizzes/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof quizzesFixture)[number]>
    const now = new Date().toISOString()
    const nextId = quizzesFixture.length + 1
    const created = {
      id: nextId,
      title: payload.title ?? `Quiz ${nextId}`,
      description: payload.description,
      status: payload.status ?? ContentStatus.Draft,
      quiz_point: payload.quiz_point ?? 0,
      total_questions: 0,
      time_limit_sec: payload.time_limit_sec,
      tags: payload.tags,
      updated_at: now,
    }

    quizzesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/quiz/quizzes/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const quiz = quizzesFixture.find((item) => item.id === id)
    if (!quiz) {
      return notFound('Quiz not found')
    }

    return HttpResponse.json(quiz)
  }),

  http.patch('*/api/quiz/quizzes/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const index = quizzesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Quiz not found')
    }

    const payload = (await request.json()) as Partial<(typeof quizzesFixture)[number]>
    const updated = {
      ...quizzesFixture[index],
      ...payload,
      updated_at: new Date().toISOString(),
    }

    quizzesFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/quiz/quizzes/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const index = quizzesFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Quiz not found')
    }

    quizzesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/quiz/quizzes/:id/progress/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const progress = quizProgressFixture.find((item) => item.quiz_id === id)
    if (!progress) {
      return HttpResponse.json({
        id: null,
        user_id: 1,
        quiz_id: id,
        best_score: 0,
        attempt_count: 0,
        first_attempted_at: null,
        last_attempted_at: null,
      })
    }

    return HttpResponse.json(progress)
  }),

  http.get('*/api/quiz/quizzes/:id/config/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    return HttpResponse.json({
      id: 1,
      quiz: id,
      user: 1,
      total_questions: null,
      time_limit_sec: null,
      random_question: true,
      random_option: true,
      question_filter: 'all',
      immediate_feedback: true,
      allow_review: true,
      allow_retry: true,
      max_attempt: null,
      is_default: true,
      is_active: true,
    })
  }),

  http.put('*/api/quiz/quizzes/:id/config/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const payload = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id: 1,
      quiz: id,
      user: 1,
      total_questions: payload.total_questions ?? null,
      time_limit_sec: payload.time_limit_sec ?? null,
      random_question: payload.random_question ?? false,
      random_option: payload.random_option ?? false,
      question_filter: payload.question_filter ?? 'all',
      immediate_feedback: payload.immediate_feedback ?? true,
      allow_review: true,
      allow_retry: true,
      max_attempt: null,
      is_default: false,
      is_active: true,
    })
  }),

  http.get('*/api/quiz/quizzes/:id/questions/', ({ params }) => {
    const quizId = parseNumericId(String(params.id))
    if (!quizId) {
      return notFound('Quiz not found')
    }

    const quiz = quizzesFixture.find((item) => item.id === quizId)
    if (!quiz) {
      return notFound('Quiz not found')
    }

    const questions = quizQuestionsFixture
      .filter((item) => item.quiz_id === quizId)
      .sort((a, b) => a.position - b.position)

    return HttpResponse.json(questions)
  }),

  http.post('*/api/quiz/quizzes/:id/questions/', async ({ params, request }) => {
    const quizId = parseNumericId(String(params.id))
    if (!quizId) {
      return notFound('Quiz not found')
    }

    const quiz = quizzesFixture.find((item) => item.id === quizId)
    if (!quiz) {
      return notFound('Quiz not found')
    }

    const payload = (await request.json()) as Partial<(typeof quizQuestionsFixture)[number]>
    const created = {
      id: quizQuestionsFixture.length + 1,
      quiz_id: quizId,
      status: payload.status ?? ContentStatus.Draft,
      question_type: payload.question_type ?? QuestionType.SingleChoice,
      content: payload.content ?? { text: 'Mock question' },
      explanation: payload.explanation,
      case_sensitive: payload.case_sensitive ?? false,
      score: payload.score ?? 1,
      position: payload.position ?? quizQuestionsFixture.filter((item) => item.quiz_id === quizId).length + 1,
      options: payload.options,
      answers: payload.answers,
    }

    quizQuestionsFixture.push(created)
    const totalQuestions = quizQuestionsFixture.filter((item) => item.quiz_id === quizId).length
    const quizIndex = quizzesFixture.findIndex((item) => item.id === quizId)
    if (quizIndex >= 0) {
      quizzesFixture[quizIndex] = {
        ...quizzesFixture[quizIndex],
        total_questions: totalQuestions,
        updated_at: new Date().toISOString(),
      }
    }

    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/quiz/quizzes/:id/questions/:qid/', ({ params }) => {
    const quizId = parseNumericId(String(params.id))
    const questionId = parseNumericId(String(params.qid))
    if (!quizId || !questionId) {
      return notFound('Question not found')
    }

    const question = quizQuestionsFixture.find((item) => item.id === questionId && item.quiz_id === quizId)
    if (!question) {
      return notFound('Question not found')
    }

    return HttpResponse.json(question)
  }),

  http.put('*/api/quiz/quizzes/:id/questions/:qid/', async ({ params, request }) => {
    const quizId = parseNumericId(String(params.id))
    const questionId = parseNumericId(String(params.qid))
    if (!quizId || !questionId) {
      return notFound('Question not found')
    }

    const index = quizQuestionsFixture.findIndex((item) => item.id === questionId && item.quiz_id === quizId)
    if (index < 0) {
      return notFound('Question not found')
    }

    const payload = (await request.json()) as Partial<(typeof quizQuestionsFixture)[number]>
    const updated = {
      ...quizQuestionsFixture[index],
      ...payload,
    }

    quizQuestionsFixture[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/quiz/quizzes/:id/questions/:qid/', ({ params }) => {
    const quizId = parseNumericId(String(params.id))
    const questionId = parseNumericId(String(params.qid))
    if (!quizId || !questionId) {
      return notFound('Question not found')
    }

    const index = quizQuestionsFixture.findIndex((item) => item.id === questionId && item.quiz_id === quizId)
    if (index < 0) {
      return notFound('Question not found')
    }

    quizQuestionsFixture.splice(index, 1)

    const now = new Date().toISOString()
    const remaining = quizQuestionsFixture
      .filter((item) => item.quiz_id === quizId)
      .sort((a, b) => a.position - b.position)

    remaining.forEach((question, idx) => {
      const targetIndex = quizQuestionsFixture.findIndex((item) => item.id === question.id)
      if (targetIndex < 0) {
        return
      }

      quizQuestionsFixture[targetIndex] = {
        ...quizQuestionsFixture[targetIndex],
        position: idx + 1,
      }
    })

    const quizIndex = quizzesFixture.findIndex((item) => item.id === quizId)
    if (quizIndex >= 0) {
      quizzesFixture[quizIndex] = {
        ...quizzesFixture[quizIndex],
        total_questions: remaining.length,
        updated_at: now,
      }
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // ── Categories ───────────────────────────────────────────────────────────────
  http.get('*/api/quiz/categories/', () => {
    return HttpResponse.json(quizCategoriesFixture)
  }),

  http.post('*/api/quiz/categories/', async ({ request }) => {
    const payload = (await request.json()) as { name: string; description?: string }
    const created = {
      id: Math.max(0, ...quizCategoriesFixture.map((c) => c.id)) + 1,
      name: payload.name,
      description: payload.description ?? '',
    }
    quizCategoriesFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/api/quiz/categories/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = quizCategoriesFixture.findIndex((c) => c.id === id)
    if (index < 0) return notFound('Category not found')
    const payload = (await request.json()) as { name?: string; description?: string }
    quizCategoriesFixture[index] = { ...quizCategoriesFixture[index], ...payload }
    return HttpResponse.json(quizCategoriesFixture[index])
  }),

  http.delete('*/api/quiz/categories/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = quizCategoriesFixture.findIndex((c) => c.id === id)
    if (index < 0) return notFound('Category not found')
    quizCategoriesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Tags ─────────────────────────────────────────────────────────────────────
  http.get('*/api/quiz/tags/', () => {
    return HttpResponse.json(quizTagsFixture)
  }),

  http.post('*/api/quiz/tags/', async ({ request }) => {
    const payload = (await request.json()) as { name: string; description?: string }
    const created = {
      id: Math.max(0, ...quizTagsFixture.map((t) => t.id)) + 1,
      name: payload.name,
      description: payload.description ?? '',
    }
    quizTagsFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/api/quiz/tags/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = quizTagsFixture.findIndex((t) => t.id === id)
    if (index < 0) return notFound('Tag not found')
    const payload = (await request.json()) as { name?: string; description?: string }
    quizTagsFixture[index] = { ...quizTagsFixture[index], ...payload }
    return HttpResponse.json(quizTagsFixture[index])
  }),

  http.delete('*/api/quiz/tags/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = quizTagsFixture.findIndex((t) => t.id === id)
    if (index < 0) return notFound('Tag not found')
    quizTagsFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── File-explorer (folders + visible quiz items + breadcrumb) ──────────────────
  http.get('*/api/quiz/nodes/explorer/', () => {
    return HttpResponse.json(buildQuizExplorerResponse(null))
  }),

  http.get('*/api/quiz/nodes/:id/explorer/', ({ params }) => {
    const folderId = Number(params.id)
    const folder = quizNodesFixture.find((n) => n.id === folderId)
    if (!folder) return notFound('Folder not found')
    return HttpResponse.json(buildQuizExplorerResponse(folder))
  }),

  // ── Quiz nodes (tree) ──────────────────────────────────────────────────────────
  http.get('*/api/quiz/nodes/', () => {
    const roots = quizNodesFixture.filter((n) => !n.parent).sort(sortFolderFirst)
    return HttpResponse.json(roots)
  }),

  http.get('*/api/quiz/nodes/:id/children/', ({ params }) => {
    const parentId = Number(params.id)
    const children = quizNodesFixture.filter((n) => n.parent === parentId).sort(sortFolderFirst)
    return HttpResponse.json(children)
  }),

  http.post('*/api/quiz/nodes/', async ({ request }) => {
    const payload = (await request.json()) as { title: string; parent_id?: number | null; is_item?: boolean }
    const parentId = payload.parent_id ?? null
    const parent = parentId ? quizNodesFixture.find((n) => n.id === parentId) : null
    const newId = Math.max(0, ...quizNodesFixture.map((n) => n.id)) + 1
    const isItem = payload.is_item ?? false

    // Atomic item create synthesises a draft quiz.
    let quizId: number | null = null
    if (isItem) {
      quizId = Math.max(0, ...quizzesFixture.map((q) => q.id)) + 1
      quizzesFixture.push({
        id: quizId,
        title: payload.title,
        status: ContentStatus.Draft,
        quiz_point: 0,
        total_questions: 0,
        updated_at: new Date().toISOString(),
      })
    }

    const path = parent ? (parent.path ? `${parent.path}.${parent.id}` : String(parent.id)) : ''
    const newNode: QuizNode = {
      id: newId,
      quiz: quizId,
      parent: parentId,
      path,
      position: 99,
      title: payload.title,
      is_item: isItem,
      has_children: false,
    }
    quizNodesFixture.push(newNode)
    return HttpResponse.json(newNode, { status: 201 })
  }),

  http.patch('*/api/quiz/nodes/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = quizNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    const payload = (await request.json()) as { title?: string }
    quizNodesFixture[index] = { ...quizNodesFixture[index], ...payload }
    return HttpResponse.json(quizNodesFixture[index])
  }),

  http.delete('*/api/quiz/nodes/:id/', ({ params }) => {
    const id = Number(params.id)
    const index = quizNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    quizNodesFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/quiz/nodes/:id/move/', async ({ params, request }) => {
    const id = Number(params.id)
    const index = quizNodesFixture.findIndex((n) => n.id === id)
    if (index < 0) return notFound('Node not found')
    const payload = (await request.json()) as { parent_id: number | null }
    const parentId = payload.parent_id ?? null
    const parent = parentId ? quizNodesFixture.find((n) => n.id === parentId) : null
    const path = parent ? (parent.path ? `${parent.path}.${parent.id}` : String(parent.id)) : ''
    quizNodesFixture[index] = { ...quizNodesFixture[index], parent: parentId, path }
    return HttpResponse.json(quizNodesFixture[index])
  }),
]
