/**
 * Quizzes service
 * Handles quiz CRUD, question management, config, and progress tracking.
 * Quiz sessions (attempt start, answers) are handled via WebSocket (useQuizSession hook).
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Quiz,
  QuizCategory,
  QuizCategoryMutationPayload,
  QuizConfig,
  QuizConfigUpdatePayload,
  QuizExplorerResponse,
  QuizNode,
  QuizQuestion,
  QuizTag,
  QuizTagMutationPayload,
  AdminQuizListParams,
  AdminQuizMutationPayload,
  AdminQuizNodeCreatePayload,
  AdminQuizNodeMovePayload,
  AdminQuizNodeUpdatePayload,
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
 * List quizzes (member view — published only) with flat-search filters.
 */
export const listQuizzes = async (params?: {
  limit?: number
  offset?: number
  status?: string
  category?: number
  search?: string
  tags?: number[]
  solved?: boolean
}): Promise<PaginatedResponse<Quiz>> => {
  // Serialize array params the way the backend expects (comma-joined tag ids).
  const query: Record<string, unknown> = { ...(params ?? {}) }
  if (Array.isArray(params?.tags)) {
    if (params.tags.length > 0) {
      query.tags = params.tags.join(',')
    } else {
      delete query.tags
    }
  }
  const response = await apiClient.get('/api/quiz/quizzes/', { params: query })
  return response.data
}

/** File-explorer contents at the root (no folderId) or inside a folder. */
export const listQuizFolderContents = async (
  folderId?: number | null
): Promise<QuizExplorerResponse> => {
  const url =
    folderId == null ? '/api/quiz/nodes/explorer/' : `/api/quiz/nodes/${folderId}/explorer/`
  const response = await apiClient.get(url)
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
 * PUT /api/quiz/quizzes/{id}/config/
 * Save per-user quiz config (persisted; snapshotted when the next session starts)
 */
export const saveQuizConfig = async (
  id: number,
  payload: QuizConfigUpdatePayload
): Promise<QuizConfig> => {
  const response = await apiClient.put(`/api/quiz/quizzes/${id}/config/`, payload)
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

// ── Admin: Category CRUD ──────────────────────────────────────────────────────

export const listQuizCategories = async (): Promise<QuizCategory[]> => {
  const response = await apiClient.get('/api/quiz/categories/')
  return response.data?.results ?? response.data
}

export const createQuizCategory = async (payload: QuizCategoryMutationPayload): Promise<QuizCategory> => {
  const response = await apiClient.post('/api/quiz/categories/', payload)
  return response.data
}

export const updateQuizCategory = async (id: number, payload: QuizCategoryMutationPayload): Promise<QuizCategory> => {
  const response = await apiClient.patch(`/api/quiz/categories/${id}/`, payload)
  return response.data
}

export const deleteQuizCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/categories/${id}/`)
}

// ── Admin: Tag CRUD ───────────────────────────────────────────────────────────

export const listQuizTags = async (): Promise<QuizTag[]> => {
  const response = await apiClient.get('/api/quiz/tags/')
  return response.data?.results ?? response.data
}

export const createQuizTag = async (payload: QuizTagMutationPayload): Promise<QuizTag> => {
  const response = await apiClient.post('/api/quiz/tags/', payload)
  return response.data
}

export const updateQuizTag = async (id: number, payload: QuizTagMutationPayload): Promise<QuizTag> => {
  const response = await apiClient.patch(`/api/quiz/tags/${id}/`, payload)
  return response.data
}

export const deleteQuizTag = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/tags/${id}/`)
}

// ── Admin: Node (tree) CRUD ───────────────────────────────────────────────────

export const createQuizNode = async (payload: AdminQuizNodeCreatePayload): Promise<QuizNode> => {
  const response = await apiClient.post('/api/quiz/nodes/', payload)
  return response.data
}

export const updateQuizNode = async (id: number, payload: AdminQuizNodeUpdatePayload): Promise<QuizNode> => {
  const response = await apiClient.patch(`/api/quiz/nodes/${id}/`, payload)
  return response.data
}

export const deleteQuizNode = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quiz/nodes/${id}/`)
}

export const moveQuizNode = async (id: number, payload: AdminQuizNodeMovePayload): Promise<QuizNode> => {
  const response = await apiClient.post(`/api/quiz/nodes/${id}/move/`, payload)
  return response.data
}
