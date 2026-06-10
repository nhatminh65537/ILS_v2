import { LessonType, LessonSource } from '@/types/course.types'
import type { QuizQuestion } from '@/types/quiz.types'

export interface LearnLessonOutlineInfo {
  readonly outline_doc_id: string
  /** Absolute viewer URL on the Outline instance (editor reference only). */
  readonly outline_url: string
  readonly last_synced_at: string | null
  readonly revision: number | null
}

export interface LearnLessonDetail {
  readonly id: number
  readonly title: string
  readonly lesson_type: LessonType
  readonly source: LessonSource
  readonly content_md?: string | null
  readonly video_url?: string | null
  readonly video_duration?: number | null
  readonly learning_point: number
  readonly learning_time?: number | null
  /** Owning course, used for the admin breadcrumb back-link. */
  readonly course_slug?: string | null
  readonly course_title?: string | null
  /** Present when the lesson is linked to an Outline document; null otherwise. */
  readonly outline_info?: LearnLessonOutlineInfo | null
}

export interface OutlineCollection {
  readonly id: string
  readonly name: string
}

export interface OutlineDocument {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly revision: number | null
  readonly updated_at: string | null
  readonly collection_id: string | null
}

export interface PaginatedOutline<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly offset: number
  readonly limit: number
}

export interface LearnMiniQuizOption {
  readonly id: number
  readonly content: string
  readonly position: number
}

export interface LearnMiniQuizQuestion {
  readonly id: number
  readonly question_type: 'single_choice' | 'multi_choice' | 'fill_blank'
  readonly content: Record<string, unknown>
  readonly explanation?: string
  readonly score: number
  readonly position: number
  readonly options?: readonly LearnMiniQuizOption[]
}

export interface LearnLessonQuestionMapping {
  readonly id: number
  readonly lesson: number
  readonly question: LearnMiniQuizQuestion
  readonly position: number
}

/** Correct answer for a mini-quiz question, resolved server-side on reveal. */
export interface LearnLessonQuestionReveal {
  readonly question_id: number
  readonly question_type: string
  readonly explanation: string
  readonly correct_option_ids: readonly number[]
  readonly correct_options: readonly { readonly id: number; readonly content: string }[]
  readonly accepted_answers: readonly string[]
}

export interface LearnLessonProgress {
  readonly id: number
  readonly user: number
  readonly lesson: number
  readonly started_at: string | null
  readonly completed_at: string | null
  readonly is_completed: boolean
}

export interface AdminLearnLessonUpdatePayload {
  title?: string
  content_md?: string
  video_url?: string | null
  video_duration?: number | null
  learning_point?: number
  learning_time?: number | null
}

export interface AdminLearnLessonQuestionAttachPayload {
  question_id: number
  position?: number
}

export interface AdminLearnLessonQuestionReorderPayload {
  position: number
}

export interface AdminLearnQuizOption {
  id: number
  title: string
  status: string
}

export interface AdminLearnQuizQuestionOption {
  id: number
  label: string
  question: QuizQuestion
}

export type LessonCompletionSignalType = 'markdown' | 'video' | 'miniquiz'

export interface LessonCompletionSignal {
  readonly type: LessonCompletionSignalType
  readonly progressPercent: number
  readonly ready: boolean
  readonly hintKey: string
}

export interface MiniquizAnswerState {
  readonly selectedOptionId?: number
  readonly selectedOptionIds?: readonly number[]
  readonly textAnswer?: string
  readonly revealed: boolean
}
