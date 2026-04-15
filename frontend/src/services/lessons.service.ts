import apiClient from '@/lib/axios'
import type {
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
