/**
 * Quizzes service
 * Handles quiz CRUD, question management, config, and progress tracking.
 * Quiz sessions (attempt start, answers) are handled via WebSocket (useQuizSession hook).
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Quiz,
  QuizConfig,
  QuizQuestion,
  AdminQuizListParams,
  AdminQuizMutationPayload,
  AdminQuizQuestionMutationPayload,
  QuizListResponse,
  QuizQuestionsListResponse,
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
 * List quizzes (member view — published only)
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
 * Create quiz from admin editor surface
 */
export const createAdminQuiz = async (payload: AdminQuizMutationPayload): Promise<Quiz> => {
  const response = await apiClient.post('/api/quiz/quizzes/', payload)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/
 * Get quiz detail
 */
export const getQuizById = async (id: number): Promise<Quiz> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/`)
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
 * Delete quiz from admin editor surface
 */
export const deleteAdminQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/quizzes/${id}/`)
}

/**
 * GET /api/quiz/quizzes/{id}/progress/
 * Get user progress on quiz (best score, attempts).
 * Returns zeros when user has never attempted.
 */
export const getQuizProgress = async (id: number): Promise<UserQuizProgress> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/progress/`)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/config/
 * Get or create per-user quiz config
 */
export const getQuizConfig = async (id: number): Promise<QuizConfig> => {
  const response = await apiClient.get(`/api/quiz/quizzes/${id}/config/`)
  return response.data
}

/**
 * GET /api/quiz/quizzes/{id}/questions/
 * Admin question manager list (Editor+)
 */
export const listAdminQuizQuestions = async (quizId: number): Promise<QuizQuestion[]> => {
  const response = await apiClient.get<QuizQuestionsListResponse>(`/api/quiz/quizzes/${quizId}/questions/`)
  return normalizeListResponse(response.data).items
}

/**
 * POST /api/quiz/quizzes/{id}/questions/
 * Create quiz question (Editor+)
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
 * Replace quiz question (Editor+)
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
 * Delete quiz question (Editor+)
 */
export const deleteAdminQuizQuestion = async (quizId: number, questionId: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/quizzes/${quizId}/questions/${questionId}/`)
}
