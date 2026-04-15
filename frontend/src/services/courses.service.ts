/**
 * Courses service
 * Canonical Learn API client for Slice 5 frontend delivery.
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import { ContentStatus } from '@/types/course.types'
import type {
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
