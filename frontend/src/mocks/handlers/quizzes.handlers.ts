import { http, HttpResponse } from 'msw'
import {
  quizAttemptsFixture,
  quizProgressFixture,
  quizQuestionsFixture,
  quizzesFixture,
} from '@/mocks/data/fixtures'
import { notFound, parseNumericId, toPaginatedResponse } from '@/mocks/handlers/shared'
import { ContentStatus, QuestionType } from '@/types/quiz.types'

export const quizzesHandlers = [
  http.get('*/api/quiz/quizzes/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')

    return HttpResponse.json(
      toPaginatedResponse(quizzesFixture, {
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
      category_id: payload.category_id,
      quiz_point: payload.quiz_point ?? 0,
      total_questions: payload.total_questions ?? 0,
      time_limit_sec: payload.time_limit_sec,
      tags: payload.tags,
      created_at: now,
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

  http.post('*/api/quiz/quizzes/:id/start_attempt/', ({ params }) => {
    const quizId = parseNumericId(String(params.id))
    if (!quizId) {
      return notFound('Quiz not found')
    }

    const quiz = quizzesFixture.find((item) => item.id === quizId)
    if (!quiz) {
      return notFound('Quiz not found')
    }

    const now = new Date().toISOString()
    const attempt = {
      id: quizAttemptsFixture.length + 1,
      quiz: quizId,
      quiz_title: quiz.title,
      user: 1,
      config: { total_questions: 0, time_limit_sec: quiz.time_limit_sec ?? 0, random_question: true, random_option: true, allow_review: true, allow_retry: true, max_attempt: null },
      started_at: now,
      finished_at: undefined,
      total_score: 0,
      is_finished: false,
      created_at: now,
    }

    quizAttemptsFixture.push(attempt)
    return HttpResponse.json(attempt, { status: 201 })
  }),

  http.post('*/api/quiz/quizzes/:attemptId/submit_answer/', ({ params }) => {
    const attemptId = parseNumericId(String(params.attemptId))
    if (!attemptId) {
      return notFound('Attempt not found')
    }

    const attempt = quizAttemptsFixture.find((item) => item.id === attemptId)
    if (!attempt) {
      return notFound('Attempt not found')
    }

    const questions = quizQuestionsFixture.filter((item) => item.quiz_id === attempt.quiz)
    const nextQuestion = questions[1]

    if (nextQuestion) {
      return HttpResponse.json({
        correct: true,
        score: 1,
        explanation: 'Mock validation succeeded',
      })
    }

    return HttpResponse.json({
      correct: true,
      score: 1,
      explanation: 'Mock validation succeeded',
    })
  }),

  http.get('*/api/quiz/quizzes/:id/progress/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Quiz not found')
    }

    const progress = quizProgressFixture.find((item) => item.quiz_id === id)
    if (!progress) {
      return HttpResponse.json({
        id: 0,
        user_id: 1,
        quiz_id: id,
        best_score: 0,
        attempt_count: 0,
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
      total_questions: 0,
      time_limit_sec: 0,
      random_question: true,
      random_option: true,
      allow_review: true,
      allow_retry: true,
      max_attempt: null,
      is_default: true,
      is_active: true,
    })
  }),

  http.get('*/api/quiz-questions/', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')
    const offset = Number(url.searchParams.get('offset') ?? '0')
    const quizId = parseNumericId(url.searchParams.get('quiz_id') ?? '')

    const pool = quizId ? quizQuestionsFixture.filter((item) => item.quiz_id === quizId) : quizQuestionsFixture

    return HttpResponse.json(
      toPaginatedResponse(pool, {
        limit,
        offset,
        basePath: '/api/quiz-questions/',
      })
    )
  }),

  http.post('*/api/quiz-questions/', async ({ request }) => {
    const payload = (await request.json()) as Partial<(typeof quizQuestionsFixture)[number]>
    const now = new Date().toISOString()
    const created = {
      id: quizQuestionsFixture.length + 1,
      quiz_id: payload.quiz_id ?? 1,
      content: payload.content ?? { text: 'Mock question' },
      question_type: payload.question_type ?? QuestionType.SingleChoice,
      status: payload.status ?? ContentStatus.Draft,
      position: payload.position ?? quizQuestionsFixture.length + 1,
      score: payload.score ?? 1,
      case_sensitive: payload.case_sensitive ?? false,
      explanation: payload.explanation,
      options: payload.options,
      created_at: now,
      updated_at: now,
    }

    quizQuestionsFixture.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('*/api/quiz-questions/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Question not found')
    }

    const question = quizQuestionsFixture.find((item) => item.id === id)
    if (!question) {
      return notFound('Question not found')
    }

    return HttpResponse.json(question)
  }),

  http.patch('*/api/quiz-questions/:id/', async ({ params, request }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Question not found')
    }

    const index = quizQuestionsFixture.findIndex((item) => item.id === id)
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

  http.delete('*/api/quiz-questions/:id/', ({ params }) => {
    const id = parseNumericId(String(params.id))
    if (!id) {
      return notFound('Question not found')
    }

    const index = quizQuestionsFixture.findIndex((item) => item.id === id)
    if (index < 0) {
      return notFound('Question not found')
    }

    quizQuestionsFixture.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
