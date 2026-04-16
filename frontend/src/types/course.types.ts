/**
 * Course domain types
 * Aligned with backend canonical Learn serializers in backend/api/serializers/course.py.
 */

import type { PaginatedResponse } from '@/types/api'

export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export enum LessonType {
  Markdown = 'markdown',
  Video = 'video',
  MiniQuiz = 'miniquiz',
}

export enum LessonSource {
  Manual = 'manual',
  Outline = 'outline',
}

export interface CourseCategory {
  readonly id: number
  readonly name: string
  readonly description?: string
}

export interface CourseTag {
  readonly id: number
  readonly name: string
  readonly description?: string
}

export interface CourseUserProgress {
  readonly completed: number
  readonly total: number
}

/**
 * Canonical course list/detail payload for /api/learn/courses/*.
 */
export interface Course {
  readonly id: number
  readonly slug: string
  readonly title: string
  readonly description?: string
  readonly status: ContentStatus
  readonly category: CourseCategory | null
  readonly tags: readonly CourseTag[]
  readonly estimated_time: number
  readonly learning_point: number
  readonly user_progress?: CourseUserProgress
  readonly created_at: string
  readonly updated_at: string
}

export type CourseWithProgress = Course

export interface LessonSummary {
  readonly id: number
  readonly title: string
  readonly lesson_type: LessonType
  readonly source: LessonSource
  readonly video_url?: string | null
  readonly video_duration?: number | null
  readonly learning_point: number
  readonly learning_time?: number | null
}

/**
 * Canonical tree node payload for /api/learn/courses/{slug}/nodes/*.
 */
export interface CourseNode {
  readonly id: number
  readonly parent: number | null
  readonly is_item: boolean
  readonly title: string
  readonly position: number
  readonly path: string
  readonly lesson?: LessonSummary | null
  readonly has_children: boolean
}

/**
 * Canonical course progress payload for /api/learn/courses/{slug}/progress/.
 * DRF DecimalField may serialize percent as string.
 */
export interface UserCourseProgress {
  readonly lesson_count: number
  readonly completed: number
  readonly percent: number | string
}

export interface CourseListParams {
  limit?: number
  offset?: number
  status?: ContentStatus | 'all'
  category?: number
  search?: string
}

export interface CreateCoursePayload {
  title: string
  slug: string
  description?: string
  status?: ContentStatus
  category_id?: number | null
  tag_ids?: number[]
  learning_point?: number
  estimated_time?: number
}

export interface UpdateCoursePayload {
  title?: string
  description?: string
  status?: ContentStatus
  category_id?: number | null
  tag_ids?: number[]
  learning_point?: number
  estimated_time?: number
}

export interface AdminLearnCourseListParams {
  search?: string
  status?: ContentStatus | 'all'
  category?: number
  limit?: number
  offset?: number
}

export interface AdminLearnCourseMutationPayload {
  title: string
  slug?: string
  description?: string
  status: ContentStatus
  category_id?: number | null
  tag_ids?: number[]
  learning_point?: number
  estimated_time?: number
}

export interface AdminLearnNodeLessonPayload {
  title: string
  lesson_type: LessonType
  source?: LessonSource
  content_md?: string | null
  video_url?: string | null
  video_duration?: number | null
  learning_point?: number
  learning_time?: number | null
}

export interface AdminLearnNodeCreatePayload {
  title: string
  parent_id?: number | null
  position?: number
  is_item: boolean
  lesson?: AdminLearnNodeLessonPayload
}

export interface AdminLearnNodeUpdatePayload {
  title?: string
  parent_id?: number | null
  position?: number
}

export interface AdminLearnStatusTogglePayload {
  slug: string
  status: ContentStatus
}

export type CourseListResponse = readonly Course[] | PaginatedResponse<Course>
export type CourseCategoryListResponse = readonly CourseCategory[] | PaginatedResponse<CourseCategory>
export type CourseTagListResponse = readonly CourseTag[] | PaginatedResponse<CourseTag>
