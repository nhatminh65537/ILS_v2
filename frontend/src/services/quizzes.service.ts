/**
 * Quizzes service
 * Handles quiz CRUD, attempts, Q&A submission, and progress tracking
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Quiz,
  QuizConfig,
  QuizQuestion,
  CreateQuizPayload,
  UpdateQuizPayload,
  CreateQuestionPayload,
  AdminQuizListParams,
  AdminQuizMutationPayload,
  AdminQuizQuestionMutationPayload,
  QuizListResponse,
  QuizQuestionsListResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  QuizAttemptResponse,
  UserQuizProgress,
} from '@/types/quiz.types'

export type NormalizedListResult<T> = {
  items: T[]
  count: number
  next: string | null
  previous: string | null
}

const isPaginatedResponse = <T>(value: readonly T[] | PaginatedResponse<T>): value is PaginatedResponse<T> =>
  !Array.isArray(value)

const normalizeListResponse = <T>(data: readonly T[] | PaginatedResponse<T>): NormalizedListResult<T> => {
  if (!isPaginatedResponse(data)) {
    return {
      items: [...data],
      count: data.length,
      next: null,
      previous: null,
    }
  }

  return {
    items: [...data.results],
    count: data.count,
    next: data.next,
    previous: data.previous,
  }
}

/**
 * GET /api/quiz/quizzes/
 * List quizzes
 */
export const listQuizzes = async (params?: {
  limit?: number
  offset?: number
  search?: string
}): Promise<PaginatedResponse<Quiz>> => {
  const response = await apiClient.get('/api/quiz/quizzes/', { params })
  return response.data
}

/**
 * GET /api/quiz/quizzes/
 * Admin list with optional status/search/pagination
 */
export const listAdminQuizzes = async (
  params?: AdminQuizListParams
): Promise<NormalizedListResult<Quiz>> => {
  const query = {
    ...(params?.limit ? { limit: params.limit } : {}),
    ...(params?.offset ? { offset: params.offset } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
  }

  const response = await apiClient.get<QuizListResponse>('/api/quiz/quizzes/', { params: query })
  return normalizeListResponse(response.data)
}

/**
 * POST /api/quiz/quizzes/
 * Create new quiz (Editor+)
 */
export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  const response = await apiClient.post('/api/quiz/quizzes/', payload)
  return response.data
}

/**
 * POST /api/quiz/quizzes/
 * Create quiz from admin editor surface
 */
export const createAdminQuiz = async (payload: AdminQuizMutationPayload): Promise<Quiz> => {
  const response = await apiClient.post('/api/quiz/quizzes/', payload)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/
 * Get quiz detail with nested questions
 */
export const getQuizById = async (id: number): Promise<Quiz> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/quiz/quizzes/{id}/
 * Update quiz
 */
export const updateQuiz = async (id: number, payload: UpdateQuizPayload): Promise<Quiz> => {
  const response = await apiClient.patch(`/api/quiz/quizzes/${id}/`, payload)
  return response.data
}

/**
 * PATCH /api/quiz/quizzes/{id}/
 * Update quiz metadata from admin editor surface
 */
export const updateAdminQuiz = async (id: number, payload: Partial<AdminQuizMutationPayload>): Promise<Quiz> => {
  const response = await apiClient.patch(`/api/quiz/quizzes/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/quiz/quizzes/{id}/
 * Delete quiz
 */
export const deleteQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/quizzes/${id}/`)
}

/**
 * DELETE /api/quiz/quizzes/{id}/
 * Delete quiz from admin editor surface
 */
export const deleteAdminQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/quizzes/${id}/`)
}

/**
 * POST /api/quiz/quizzes/{id}/start_attempt/
 * Start quiz attempt (creates QuizAttempt, returns first question)
 */
export const startQuizAttempt = async (id: number): Promise<QuizAttemptResponse> => {
  const response = await apiClient.post(`/api/quiz/quizzes/${id}/start_attempt/`)
  return response.data
}

/**
 * POST /api/quiz/quizzes/{quiz_id}/submit_answer/
 * Submit answer to current question
 * Returns is_correct, score, explanation
 */
export const submitQuizAnswer = async (quizId: number, payload: SubmitAnswerPayload): Promise<SubmitAnswerResponse> => {
  const response = await apiClient.post(`/api/quiz/quizzes/${quizId}/submit_answer/`, payload)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/progress/
 * Get user progress on quiz (best score, attempts, etc)
 */
export const getQuizProgress = async (id: number): Promise<UserQuizProgress> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/progress/`)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/config/
 * Get or create user quiz config (per-user overrides)
 */
export const getQuizConfig = async (id: number): Promise<QuizConfig> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/config/`)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/questions/
 * Admin question manager list
 */
export const listAdminQuizQuestions = async (quizId: number): Promise<QuizQuestion[]> => {
  const response = await apiClient.get<QuizQuestionsListResponse>(`/api/quiz/quizzes/${quizId}/questions/`)
  return normalizeListResponse(response.data).items
}

/**
 * POST /api/quiz/quizzes/{id}/questions/
 * Create quiz question in nested canonical route
 */
export const createAdminQuizQuestion = async (
  quizId: number,
  payload: AdminQuizQuestionMutationPayload
): Promise<QuizQuestion> => {
  const response = await apiClient.post(`/api/quiz/quizzes/${quizId}/questions/`, payload)
  return response.data
}

/**
 * PUT /api/quiz/quizzes/{id}/questions/{qid}/
 * Update quiz question in nested canonical route
 */
export const updateAdminQuizQuestion = async (
  quizId: number,
  questionId: number,
  payload: AdminQuizQuestionMutationPayload
): Promise<QuizQuestion> => {
  const response = await apiClient.put(`/api/quiz/quizzes/${quizId}/questions/${questionId}/`, payload)
  return response.data
}

/**
 * DELETE /api/quiz/quizzes/{id}/questions/{qid}/
 * Delete quiz question in nested canonical route
 */
export const deleteAdminQuizQuestion = async (quizId: number, questionId: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/quizzes/${quizId}/questions/${questionId}/`)
}

/**
 * GET /api/quiz-questions/
 * List quiz questions (for editing)
 */
export const listQuizQuestions = async (params?: {
  quiz_id?: number
  limit?: number
  offset?: number
}): Promise<PaginatedResponse<QuizQuestion>> => {
  const response = await apiClient.get('/api/quiz-questions/', { params })
  return response.data
}

/**
 * POST /api/quiz-questions/
 * Create quiz question
 */
export const createQuizQuestion = async (payload: CreateQuestionPayload): Promise<QuizQuestion> => {
  const response = await apiClient.post('/api/quiz-questions/', payload)
  return response.data
}

/**
 * GET /api/quiz-questions/{id}/
 * Get quiz question detail
 */
export const getQuizQuestionById = async (id: number): Promise<QuizQuestion> => {
  const response = await apiClient.get(`/api/quiz-questions/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/quiz-questions/{id}/
 * Update quiz question
 */
export const updateQuizQuestion = async (
  id: number,
  payload: Partial<CreateQuestionPayload>
): Promise<QuizQuestion> => {
  const response = await apiClient.patch(`/api/quiz-questions/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/quiz-questions/{id}/
 * Delete quiz question
 */
export const deleteQuizQuestion = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz-questions/${id}/`)
}
