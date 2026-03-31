/**
 * Courses service
 * Handles course CRUD, tree navigation, progress tracking, and enrollment
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Course,
  CourseWithProgress,
  CourseNode,
  CourseCategory,
  CreateCoursePayload,
  UpdateCoursePayload,
  UserCourseProgress,
} from '@/types/course.types'

/**
 * GET /api/courses/
 * List courses with optional filters (status, category, search)
 */
export const listCourses = async (params?: {
  limit?: number
  offset?: number
  status?: string
  category?: number
  search?: string
}): Promise<PaginatedResponse<CourseWithProgress>> => {
  const response = await apiClient.get('/api/courses/', { params })
  return response.data
}

/**
 * POST /api/courses/
 * Create new course (Editor+)
 */
export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
  const response = await apiClient.post('/api/courses/', payload)
  return response.data
}

/**
 * GET /api/courses/{id}/
 * Get course detail
 */
export const getCourseById = async (id: number): Promise<CourseWithProgress> => {
  const response = await apiClient.get(`/api/courses/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/courses/{id}/
 * Update course
 */
export const updateCourse = async (id: number, payload: UpdateCoursePayload): Promise<Course> => {
  const response = await apiClient.patch(`/api/courses/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/courses/{id}/
 * Delete course
 */
export const deleteCourse = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/courses/${id}/`)
}

/**
 * GET /api/courses/{id}/tree/
 * Get course tree structure (root nodes with prefetched children)
 */
export const getCourseTree = async (id: number, params?: { parent?: number }): Promise<readonly CourseNode[]> => {
  const response = await apiClient.get(`/api/courses/${id}/tree/`, { params })
  return response.data
}

/**
 * GET /api/courses/{id}/progress/
 * Get or create user course progress
 */
export const getCourseProgress = async (id: number): Promise<UserCourseProgress> => {
  const response = await apiClient.get(`/api/courses/${id}/progress/`)
  return response.data
}

/**
 * POST /api/courses/{id}/enroll/
 * Enroll current user in course (creates enrollment progress)
 */
export const enrollCourse = async (id: number): Promise<UserCourseProgress> => {
  const response = await apiClient.post(`/api/courses/${id}/enroll/`)
  return response.data
}

/**
 * GET /api/course-categories/
 * List course categories
 */
export const listCourseCategories = async (): Promise<PaginatedResponse<CourseCategory>> => {
  const response = await apiClient.get('/api/course-categories/')
  return response.data
}

/**
 * POST /api/course-categories/
 * Create course category (Admin)
 */
export const createCourseCategory = async (payload: { name: string; description?: string }): Promise<CourseCategory> => {
  const response = await apiClient.post('/api/course-categories/', payload)
  return response.data
}

/**
 * GET /api/course-categories/{id}/
 * Get course category detail
 */
export const getCourseCategoryById = async (id: number): Promise<CourseCategory> => {
  const response = await apiClient.get(`/api/course-categories/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/course-categories/{id}/
 * Update course category
 */
export const updateCourseCategory = async (
  id: number,
  payload: { name?: string; description?: string }
): Promise<CourseCategory> => {
  const response = await apiClient.patch(`/api/course-categories/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/course-categories/{id}/
 * Delete course category
 */
export const deleteCourseCategoryById = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/course-categories/${id}/`)
}
