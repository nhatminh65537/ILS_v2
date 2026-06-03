/**
 * Courses service
 * Canonical Learn API client for Slice 5 frontend delivery.
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import { ContentStatus } from '@/types/course.types'
import type {
  AdminLearnCourseListParams,
  AdminLearnCourseMutationPayload,
  AdminLearnNodeCreatePayload,
  AdminLearnNodeUpdatePayload,
  Course,
  CourseCategory,
  CourseCategoryListResponse,
  CourseListParams,
  CourseListResponse,
  CourseNode,
  CourseTag,
  CourseTagListResponse,
  UserCourseProgress,
} from '@/types/course.types'

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
 * GET /api/learn/courses/
 * Member-facing list (published-only for Member role; status filter optional for privileged roles).
 */
export const listLearnCourses = async (params?: CourseListParams): Promise<NormalizedListResult<Course>> => {
  const query = {
    ...(params?.limit ? { limit: params.limit } : {}),
    ...(params?.offset ? { offset: params.offset } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
  }

  const response = await apiClient.get<CourseListResponse>('/api/learn/courses/', { params: query })
  return normalizeListResponse(response.data)
}

/**
 * GET /api/learn/courses/{slug}/
 */
export const getLearnCourseBySlug = async (slug: string): Promise<Course> => {
  const response = await apiClient.get(`/api/learn/courses/${slug}/`)
  return response.data
}

/**
 * GET /api/learn/courses/{slug}/progress/
 */
export const getLearnCourseProgress = async (slug: string): Promise<UserCourseProgress> => {
  const response = await apiClient.get(`/api/learn/courses/${slug}/progress/`)
  return response.data
}

/**
 * GET /api/learn/courses/{slug}/nodes/
 */
export const listLearnRootNodes = async (slug: string): Promise<CourseNode[]> => {
  const response = await apiClient.get<readonly CourseNode[]>(`/api/learn/courses/${slug}/nodes/`)
  return [...response.data]
}

/**
 * GET /api/learn/courses/{slug}/nodes/{nodeId}/children/
 */
export const listLearnNodeChildren = async (slug: string, nodeId: number): Promise<CourseNode[]> => {
  const response = await apiClient.get<readonly CourseNode[]>(`/api/learn/courses/${slug}/nodes/${nodeId}/children/`)
  return [...response.data]
}

/**
 * GET /api/learn/categories/
 */
export const listLearnCategories = async (): Promise<NormalizedListResult<CourseCategory>> => {
  const response = await apiClient.get<CourseCategoryListResponse>('/api/learn/categories/')
  return normalizeListResponse(response.data)
}

/**
 * GET /api/learn/tags/
 */
export const listLearnTags = async (): Promise<NormalizedListResult<CourseTag>> => {
  const response = await apiClient.get<CourseTagListResponse>('/api/learn/tags/')
  return normalizeListResponse(response.data)
}

/**
 * GET /api/learn/courses/
 * Admin/editor list endpoint (supports status filters).
 */
export const listAdminLearnCourses = async (
  params?: AdminLearnCourseListParams
): Promise<NormalizedListResult<Course>> => {
  const query = {
    ...(params?.limit ? { limit: params.limit } : {}),
    ...(params?.offset ? { offset: params.offset } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
  }

  const response = await apiClient.get<CourseListResponse>('/api/learn/courses/', { params: query })
  return normalizeListResponse(response.data)
}

/**
 * POST /api/learn/courses/
 */
export const createAdminLearnCourse = async (payload: AdminLearnCourseMutationPayload): Promise<Course> => {
  const response = await apiClient.post<Course>('/api/learn/courses/', payload)
  return response.data
}

/**
 * PUT /api/learn/courses/{slug}/
 */
export const updateAdminLearnCourse = async (
  slug: string,
  payload: AdminLearnCourseMutationPayload
): Promise<Course> => {
  const response = await apiClient.put<Course>(`/api/learn/courses/${slug}/`, payload)
  return response.data
}

/**
 * DELETE /api/learn/courses/{slug}/
 */
export const deleteAdminLearnCourse = async (
  slug: string,
  mode: 'archive' | 'purge' = 'archive'
): Promise<void> => {
  await apiClient.delete(`/api/learn/courses/${slug}/`, { params: { mode } })
}

/**
 * POST /api/learn/courses/{slug}/nodes/reorder/
 * Reindex sibling order under a parent by sending the full ordered id list.
 */
export const reorderAdminLearnNodes = async (
  slug: string,
  parentId: number | null,
  orderedIds: number[]
): Promise<void> => {
  await apiClient.post(`/api/learn/courses/${slug}/nodes/reorder/`, {
    ...(parentId != null ? { parent_id: parentId } : {}),
    ordered_ids: orderedIds,
  })
}

/**
 * GET /api/learn/categories/
 */
export const listAdminLearnCategories = async (): Promise<NormalizedListResult<CourseCategory>> => {
  const response = await apiClient.get<CourseCategoryListResponse>('/api/learn/categories/')
  return normalizeListResponse(response.data)
}

/**
 * POST /api/learn/categories/
 */
export const createAdminLearnCategory = async (payload: {
  name: string
  description?: string
}): Promise<CourseCategory> => {
  const response = await apiClient.post<CourseCategory>('/api/learn/categories/', payload)
  return response.data
}

/**
 * PUT /api/learn/categories/{id}/
 */
export const updateAdminLearnCategory = async (
  id: number,
  payload: { name: string; description?: string }
): Promise<CourseCategory> => {
  const response = await apiClient.put<CourseCategory>(`/api/learn/categories/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/learn/categories/{id}/
 */
export const deleteAdminLearnCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/learn/categories/${id}/`)
}

/**
 * GET /api/learn/tags/
 */
export const listAdminLearnTags = async (): Promise<NormalizedListResult<CourseTag>> => {
  const response = await apiClient.get<CourseTagListResponse>('/api/learn/tags/')
  return normalizeListResponse(response.data)
}

/**
 * POST /api/learn/tags/
 */
export const createAdminLearnTag = async (payload: { name: string; description?: string }): Promise<CourseTag> => {
  const response = await apiClient.post<CourseTag>('/api/learn/tags/', payload)
  return response.data
}

/**
 * PUT /api/learn/tags/{id}/
 */
export const updateAdminLearnTag = async (
  id: number,
  payload: { name: string; description?: string }
): Promise<CourseTag> => {
  const response = await apiClient.put<CourseTag>(`/api/learn/tags/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/learn/tags/{id}/
 */
export const deleteAdminLearnTag = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/learn/tags/${id}/`)
}

/**
 * POST /api/learn/courses/{slug}/nodes/
 */
export const createAdminLearnNode = async (
  slug: string,
  payload: AdminLearnNodeCreatePayload
): Promise<CourseNode> => {
  const response = await apiClient.post<CourseNode>(`/api/learn/courses/${slug}/nodes/`, payload)
  return response.data
}

/**
 * PUT /api/learn/courses/{slug}/nodes/{id}/
 */
export const updateAdminLearnNode = async (
  slug: string,
  nodeId: number,
  payload: AdminLearnNodeUpdatePayload
): Promise<CourseNode> => {
  const response = await apiClient.put<CourseNode>(`/api/learn/courses/${slug}/nodes/${nodeId}/`, payload)
  return response.data
}

/**
 * DELETE /api/learn/courses/{slug}/nodes/{id}/
 */
export const deleteAdminLearnNode = async (slug: string, nodeId: number): Promise<void> => {
  await apiClient.delete(`/api/learn/courses/${slug}/nodes/${nodeId}/`)
}

/**
 * Admin aliases for tree reads.
 */
export const listAdminLearnRootNodes = listLearnRootNodes
export const listAdminLearnNodeChildren = listLearnNodeChildren

/**
 * Backward-compatible alias for consumers not yet migrated.
 */
export const listCourses = listLearnCourses
export const getCourseBySlug = getLearnCourseBySlug
export const getCourseProgress = getLearnCourseProgress
export const listCourseRootNodes = listLearnRootNodes
export const listCourseNodeChildren = listLearnNodeChildren

export const normalizeCourseStatus = (status: string | null | undefined): ContentStatus | undefined => {
  if (!status) {
    return undefined
  }

  if (status === ContentStatus.Draft || status === ContentStatus.Published || status === ContentStatus.Archived) {
    return status
  }

  return undefined
}

/**
 * Legacy-compat helper retained intentionally for unresolved consumers.
 * TODO: Remove when no callsites remain.
 */
export const getCourseTree = async (slug: string): Promise<readonly CourseNode[]> => {
  const response = await apiClient.get<readonly CourseNode[]>(`/api/learn/courses/${slug}/nodes/`)
  return response.data
}
