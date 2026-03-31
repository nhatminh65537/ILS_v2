/**
 * Quizzes service
 * Handles quiz CRUD, attempts, Q&A submission, and progress tracking
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Quiz,
  QuizQuestion,
  CreateQuizPayload,
  UpdateQuizPayload,
  CreateQuestionPayload,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  QuizAttemptResponse,
  UserQuizProgress,
} from '@/types/quiz.types'

/**
 * GET /api/quizzes/
 * List quizzes
 */
export const listQuizzes = async (params?: {
  limit?: number
  offset?: number
  search?: string
}): Promise<PaginatedResponse<Quiz>> => {
  const response = await apiClient.get('/api/quizzes/', { params })
  return response.data
}

/**
 * POST /api/quizzes/
 * Create new quiz (Editor+)
 */
export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  const response = await apiClient.post('/api/quizzes/', payload)
  return response.data
}

/**
 * GET /api/quizzes/{id}/
 * Get quiz detail with nested questions
 */
export const getQuizById = async (id: number): Promise<Quiz> => {
  const response = await apiClient.get(`/api/quizzes/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/quizzes/{id}/
 * Update quiz
 */
export const updateQuiz = async (id: number, payload: UpdateQuizPayload): Promise<Quiz> => {
  const response = await apiClient.patch(`/api/quizzes/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/quizzes/{id}/
 * Delete quiz
 */
export const deleteQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/quizzes/${id}/`)
}

/**
 * POST /api/quizzes/{id}/start_attempt/
 * Start quiz attempt (creates QuizAttempt, returns first question)
 */
export const startQuizAttempt = async (id: number): Promise<QuizAttemptResponse> => {
  const response = await apiClient.post(`/api/quizzes/${id}/start_attempt/`)
  return response.data
}

/**
 * POST /api/quizzes/{attempt_id}/submit_answer/
 * Submit answer to current question via WebSocket or REST
 * Returns result + next question or final score
 */
export const submitQuizAnswer = async (attemptId: number, payload: SubmitAnswerPayload): Promise<SubmitAnswerResponse> => {
  const response = await apiClient.post(`/api/quizzes/${attemptId}/submit_answer/`, payload)
  return response.data
}

/**
 * GET /api/quizzes/{id}/progress/
 * Get user progress on quiz (best score, attempts, etc)
 */
export const getQuizProgress = async (id: number): Promise<UserQuizProgress> => {
  const response = await apiClient.get(`/api/quizzes/${id}/progress/`)
  return response.data
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
