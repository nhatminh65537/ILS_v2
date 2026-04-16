import { LessonType, LessonSource } from '@/types/course.types'
import type { QuizQuestion } from '@/types/quiz.types'

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
