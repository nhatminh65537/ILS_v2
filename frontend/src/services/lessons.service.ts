import apiClient from '@/lib/axios'
import type {
  AdminLearnLessonQuestionAttachPayload,
  AdminLearnLessonQuestionReorderPayload,
  AdminLearnLessonUpdatePayload,
  LearnLessonDetail,
  LearnLessonProgress,
  LearnLessonQuestionMapping,
  LearnLessonQuestionReveal,
  OutlineCollection,
  OutlineDocument,
  PaginatedOutline,
} from '@/types/lesson.types'

/**
 * GET /api/learn/lessons/{id}/
 */
export const getLearnLessonById = async (lessonId: number): Promise<LearnLessonDetail> => {
  const response = await apiClient.get<LearnLessonDetail>(`/api/learn/lessons/${lessonId}/`)
  return response.data
}

/**
 * GET /api/learn/lessons/{id}/questions/
 */
export const listLearnLessonQuestions = async (lessonId: number): Promise<LearnLessonQuestionMapping[]> => {
  const response = await apiClient.get<readonly LearnLessonQuestionMapping[]>(`/api/learn/lessons/${lessonId}/questions/`)
  return [...response.data]
}

/**
 * GET /api/learn/lessons/{id}/questions/{qid}/reveal/
 * Correct answer for a mini-quiz question, resolved server-side on reveal.
 */
export const revealLearnLessonQuestion = async (
  lessonId: number,
  questionId: number
): Promise<LearnLessonQuestionReveal> => {
  const response = await apiClient.get<LearnLessonQuestionReveal>(
    `/api/learn/lessons/${lessonId}/questions/${questionId}/reveal/`
  )
  return response.data
}

/**
 * POST /api/learn/lessons/{id}/progress/start/
 */
export const startLearnLessonProgress = async (lessonId: number): Promise<LearnLessonProgress> => {
  const response = await apiClient.post<LearnLessonProgress>(`/api/learn/lessons/${lessonId}/progress/start/`)
  return response.data
}

/**
 * POST /api/learn/lessons/{id}/progress/complete/
 */
export const completeLearnLessonProgress = async (lessonId: number): Promise<LearnLessonProgress> => {
  const response = await apiClient.post<LearnLessonProgress>(`/api/learn/lessons/${lessonId}/progress/complete/`)
  return response.data
}

/**
 * PUT /api/learn/lessons/{id}/
 */
export const updateLearnLesson = async (
  lessonId: number,
  payload: AdminLearnLessonUpdatePayload
): Promise<LearnLessonDetail> => {
  const response = await apiClient.put<LearnLessonDetail>(`/api/learn/lessons/${lessonId}/`, payload)
  return response.data
}

/**
 * POST /api/learn/lessons/{id}/questions/
 */
export const attachLearnLessonQuestion = async (
  lessonId: number,
  payload: AdminLearnLessonQuestionAttachPayload
): Promise<LearnLessonQuestionMapping> => {
  const response = await apiClient.post<LearnLessonQuestionMapping>(`/api/learn/lessons/${lessonId}/questions/`, payload)
  return response.data
}

/**
 * PUT /api/learn/lesson-questions/{id}/
 */
export const updateLearnLessonQuestion = async (
  mappingId: number,
  payload: AdminLearnLessonQuestionReorderPayload
): Promise<LearnLessonQuestionMapping> => {
  const response = await apiClient.put<LearnLessonQuestionMapping>(`/api/learn/lesson-questions/${mappingId}/`, payload)
  return response.data
}

/**
 * DELETE /api/learn/lesson-questions/{id}/
 */
export const deleteLearnLessonQuestion = async (mappingId: number): Promise<void> => {
  await apiClient.delete(`/api/learn/lesson-questions/${mappingId}/`)
}

// ── Outline sync (Task 5.8) ──────────────────────────────────────────────────

/**
 * GET /api/learn/outline/collections/ — browse Outline collections (Admin/Editor).
 */
export const listOutlineCollections = async (
  params: { offset?: number; limit?: number } = {}
): Promise<PaginatedOutline<OutlineCollection>> => {
  const response = await apiClient.get<PaginatedOutline<OutlineCollection>>(
    '/api/learn/outline/collections/',
    { params }
  )
  return response.data
}

/**
 * GET /api/learn/outline/documents/ — browse Outline documents, optionally
 * filtered by collection (Admin/Editor).
 */
export const listOutlineDocuments = async (
  params: { collectionId?: string; offset?: number; limit?: number } = {}
): Promise<PaginatedOutline<OutlineDocument>> => {
  const { collectionId, ...rest } = params
  const response = await apiClient.get<PaginatedOutline<OutlineDocument>>(
    '/api/learn/outline/documents/',
    { params: { ...rest, ...(collectionId ? { collection_id: collectionId } : {}) } }
  )
  return response.data
}

/**
 * POST /api/learn/lessons/{id}/outline/ — link a doc + import its markdown.
 */
export const linkLessonOutline = async (
  lessonId: number,
  outlineDocId: string
): Promise<LearnLessonDetail> => {
  const response = await apiClient.post<LearnLessonDetail>(
    `/api/learn/lessons/${lessonId}/outline/`,
    { outline_doc_id: outlineDocId }
  )
  return response.data
}

/**
 * POST /api/learn/lessons/{id}/sync-outline/ — re-pull content (503 keeps old content).
 */
export const syncLessonOutline = async (lessonId: number): Promise<LearnLessonDetail> => {
  const response = await apiClient.post<LearnLessonDetail>(
    `/api/learn/lessons/${lessonId}/sync-outline/`
  )
  return response.data
}

/**
 * DELETE /api/learn/lessons/{id}/outline/ — detach from Outline.
 */
export const unlinkLessonOutline = async (lessonId: number): Promise<LearnLessonDetail> => {
  const response = await apiClient.delete<LearnLessonDetail>(
    `/api/learn/lessons/${lessonId}/outline/`
  )
  return response.data
}
