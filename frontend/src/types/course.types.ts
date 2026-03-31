/**
 * Course domain types
 * Derived from DATA_MODEL.md Course Domain section
 */

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

/** Course category */
export interface CourseCategory {
  readonly id: number
  readonly name: string
  readonly description?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Core course entity */
export interface Course {
  readonly id: number
  readonly slug: string // URL-friendly unique identifier
  readonly title: string
  readonly description?: string
  readonly status: ContentStatus
  readonly category_id?: number
  readonly learning_point: number
  readonly coverage?: string // Percentage like "50%"
  readonly created_at: string
  readonly updated_at: string
}

/** Course with user progress */
export interface CourseWithProgress extends Course {
  readonly user_progress?: {
    readonly completed: number
    readonly total: number
    readonly percent: number
  }
}

/** Course tree node (hierarchical structure) */
export interface CourseNode {
  readonly id: number
  readonly course_id: number
  readonly parent_id?: number
  readonly path: string // dot-separated: "1.3.2"
  readonly position: number
  readonly node_type: 'section' | 'lesson'
  readonly title: string
  readonly children?: readonly CourseNode[]
}

/** Lesson entity */
export interface Lesson {
  readonly id: number
  readonly course_node_id: number
  readonly title: string
  readonly content?: string // markdown or HTML
  readonly lesson_type: LessonType
  readonly source: LessonSource
  readonly outline_url?: string // for outline-sourced lessons
  readonly status: ContentStatus
  readonly created_at: string
  readonly updated_at: string
}

/** Mini-quiz question within a lesson */
export interface LessonQuestion {
  readonly id: number
  readonly lesson_id: number
  readonly question_text: string
  readonly position: number
  readonly options: readonly QuestionOption[]
  readonly correct_answer: string
  readonly explanation?: string
  readonly created_at: string
}

export interface QuestionOption {
  readonly id: number
  readonly text: string
  readonly position: number
}

/** User course progress tracking */
export interface UserCourseProgress {
  readonly id: number
  readonly user_id: number
  readonly course_id: number
  readonly started_at?: string
  readonly completed_at?: string
  readonly percent_complete: number
  readonly created_at: string
  readonly updated_at: string
}

/** User lesson progress tracking */
export interface UserLessonProgress {
  readonly id: number
  readonly user_id: number
  readonly lesson_id: number
  readonly started_at?: string
  readonly completed_at?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Course request/response payloads */
export interface CreateCoursePayload {
  title: string
  description?: string
  status: ContentStatus
  category_id?: number
  learning_point?: number
}

export interface UpdateCoursePayload {
  title?: string
  description?: string
  status?: ContentStatus
  category_id?: number
  learning_point?: number
}

export interface CreateLessonPayload {
  course_node_id: number
  title: string
  content?: string
  lesson_type: LessonType
  source: LessonSource
  outline_url?: string
}

export interface UpdateLessonPayload {
  title?: string
  content?: string
  lesson_type?: LessonType
  status?: ContentStatus
}

export interface CourseProgressResponse {
  readonly course_id: number
  readonly lessons_total: number
  readonly lessons_completed: number
  readonly percent: number
}
