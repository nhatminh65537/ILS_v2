import apiClient from '@/lib/axios'
import type {
  AdminLearnLessonQuestionAttachPayload,
  AdminLearnLessonQuestionReorderPayload,
  AdminLearnLessonUpdatePayload,
  LearnLessonDetail,
  LearnLessonProgress,
  LearnLessonQuestionMapping,
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
