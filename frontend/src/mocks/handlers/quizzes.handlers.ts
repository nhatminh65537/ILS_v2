import { http, HttpResponse } from 'msw'
import {
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
    const status = url.searchParams.get('status')

    const filteredQuizzes = status && status !== 'all'
      ? quizzesFixture.filter((quiz) => quiz.status === status)
      : quizzesFixture

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
      allow_review: true,
      allow_retry: true,
      max_attempt: null,
      is_default: true,
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
]
