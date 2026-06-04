/**
 * Quiz domain types
 * Aligned with backend serializers (backend/api/serializers.py)
 * Source of truth: backend/api/models.py Quiz domain
 */

import type { PaginatedResponse } from '@/types/api'

export enum QuestionType {
  SingleChoice = 'single_choice',
  MultiChoice = 'multi_choice',
  FillBlank = 'fill_blank',
}

export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

/** Quiz category */
export interface QuizCategory {
  readonly id: number
  readonly name: string
  readonly description?: string
}

/** Quiz tag */
export interface QuizTag {
  readonly id: number
  readonly name: string
  readonly description?: string
}

/**
 * Core quiz entity
 * Matches QuizListSerializer / QuizDetailSerializer
 */
export interface Quiz {
  readonly id: number
  readonly title: string
  readonly description?: string
  readonly status: ContentStatus
  readonly quiz_point: number
  readonly total_questions: number
  readonly time_limit_sec?: number
  /** FK integer from list endpoint; nested object from detail endpoint */
  readonly category?: number | QuizCategory | null
  /** Convenience string from the list serializer */
  readonly category_name?: string | null
  readonly tags?: readonly QuizTag[]
  /** Present on the flat list serializer; true when the requester solved it. */
  readonly is_solved?: boolean
  readonly updated_at: string
}

/**
 * Quiz tree node (folder = node, quiz = leaf item via OneToOne quiz)
 * Matches QuizNodeSerializer fields exactly
 */
export interface QuizNode {
  readonly id: number
  readonly parent: number | null
  readonly is_item: boolean
  readonly title: string
  readonly position: number
  readonly path: string
  /** null = folder; set = quiz item node (FK id from the serializer) */
  readonly quiz: number | null
  readonly has_children: boolean
}

/** Quiz summary embedded in a file-explorer item node. */
export interface QuizExplorerSummary {
  readonly id: number
  readonly title: string
  readonly status: ContentStatus
  readonly quiz_point: number
  readonly total_questions: number
  readonly time_limit_sec?: number | null
  readonly category_name?: string | null
  readonly tags?: readonly QuizTag[]
  readonly is_solved: boolean
}

/** One node (folder or quiz item) in the file-explorer. */
export interface QuizExplorerNode {
  readonly id: number
  readonly is_item: boolean
  readonly title: string
  readonly path: string
  readonly quiz: QuizExplorerSummary | null
}

/** A breadcrumb crumb for explorer navigation. */
export interface QuizBreadcrumbCrumb {
  readonly id: number
  readonly title: string
}

/** Response of the explorer endpoints (root or folder). */
export interface QuizExplorerResponse {
  readonly folder: { id: number; title: string; path: string } | null
  readonly breadcrumb: readonly QuizBreadcrumbCrumb[]
  readonly nodes: readonly QuizExplorerNode[]
}

/**
 * Quiz question option
 * Matches QuizQuestionOptionSerializer (is_correct hidden from members)
 * Matches QuizQuestionOptionManageSerializer (is_correct visible to editors)
 */
export interface QuizQuestionOption {
  readonly id: number
  readonly content: string
  readonly position: number
  readonly is_correct?: boolean // only present for editors/admins
}

/**
 * Quiz question
 * content is a JSON dict; content.text holds the question text
 * Matches QuizQuestionManageSerializer (editor view)
 */
export interface QuizQuestion {
  readonly id: number
  readonly status: ContentStatus
  readonly question_type: QuestionType
  readonly content: Record<string, unknown> // { text: string, ... }
  readonly explanation?: string
  readonly case_sensitive: boolean
  readonly score: number
  readonly position: number
  readonly options?: readonly QuizQuestionOption[]
  readonly answers?: readonly QuizQuestionAnswer[]
}

export interface QuizQuestionAnswer {
  readonly id: number
  readonly answer: string
}

/** User quiz progress (aggregate) — matches UserQuizProgressSerializer */
export interface UserQuizProgress {
  readonly id: number | null
  readonly user_id: number
  readonly quiz_id: number
  readonly best_score: number
  readonly attempt_count: number
  readonly first_attempted_at?: string | null
  readonly last_attempted_at?: string | null
}

/** Which subset of a quiz's questions to practice. */
export enum QuizQuestionFilter {
  All = 'all',
  /** Only questions the user has NOT yet answered correctly. */
  Unsolved = 'unsolved',
  /** Only questions the user has already answered correctly (revision). */
  Solved = 'solved',
}

/**
 * Quiz config per user
 * Matches QuizConfigSerializer (backend/api/serializers.py)
 * total_questions / time_limit_sec are nullable (null = no limit / use all)
 */
export interface QuizConfig {
  readonly id: number
  readonly quiz: number
  readonly user: number
  readonly total_questions: number | null
  readonly time_limit_sec: number | null
  readonly random_question: boolean
  readonly random_option: boolean
  readonly question_filter: QuizQuestionFilter
  readonly immediate_feedback: boolean
  readonly allow_review: boolean
  readonly allow_retry: boolean
  readonly max_attempt?: number | null
  readonly is_default: boolean
  readonly is_active: boolean
}

/** Editable subset of QuizConfig the member can change on the detail page. */
export interface QuizConfigUpdatePayload {
  total_questions: number | null
  time_limit_sec: number | null
  random_question: boolean
  random_option: boolean
  question_filter: QuizQuestionFilter
  immediate_feedback: boolean
}

/** Request/response payloads */
export interface CreateQuizPayload {
  title: string
  description?: string
  status: ContentStatus
  time_limit_sec?: number
  quiz_point?: number
}

export interface UpdateQuizPayload {
  title?: string
  description?: string
  status?: ContentStatus
  time_limit_sec?: number
  quiz_point?: number
}

export interface AdminQuizListParams {
  search?: string
  status?: ContentStatus | 'all'
  limit?: number
  offset?: number
}

export interface AdminQuizMutationPayload {
  title: string
  description?: string
  status: ContentStatus
  quiz_point?: number
  time_limit_sec?: number
  category_id?: number | null
  tag_ids?: number[]
}

// ── Admin node + taxonomy payloads (mirror challenge) ──────────────────────────

export interface AdminQuizNodeCreatePayload {
  title: string
  parent_id: number | null
  /** Folder = false; item auto-creates a draft Quiz from the title. */
  is_item: boolean
}

export interface AdminQuizNodeUpdatePayload {
  title?: string
}

export interface AdminQuizNodeMovePayload {
  parent_id: number | null
}

export interface QuizCategoryMutationPayload {
  name: string
  description?: string
}

export interface QuizTagMutationPayload {
  name: string
  description?: string
}

export interface QuizQuestionOptionInput {
  content: string
  position: number
  is_correct: boolean
}

export interface QuizQuestionAnswerInput {
  answer: string
}

export interface AdminQuizQuestionMutationPayload {
  question_type: QuestionType
  content: {
    text: string
  }
  explanation?: string
  case_sensitive: boolean
  score: number
  position: number
  options?: QuizQuestionOptionInput[]
  answers?: QuizQuestionAnswerInput[]
}

export type AdminQuestionFormState =
  | {
      question_type: QuestionType.SingleChoice | QuestionType.MultiChoice
      contentText: string
      explanation: string
      case_sensitive: boolean
      score: number
      position: number
      options: QuizQuestionOptionInput[]
    }
  | {
      question_type: QuestionType.FillBlank
      contentText: string
      explanation: string
      case_sensitive: boolean
      score: number
      position: number
      answers: QuizQuestionAnswerInput[]
    }

export type QuizListResponse = readonly Quiz[] | PaginatedResponse<Quiz>
export type QuizQuestionsListResponse = readonly QuizQuestion[] | PaginatedResponse<QuizQuestion>

// ─── WebSocket session types ───────────────────────────────────────────────

/** A question option as sent by the WS consumer (no is_correct) */
export interface SessionQuestionOption {
  readonly id: number
  readonly content: string
  readonly position: number
}

/** Question payload inside WsQuestionEvent */
export interface SessionQuestion {
  readonly id: number
  readonly type: QuestionType
  readonly content: { text: string }
  readonly time_limit_sec?: number
  /** When false, the session shows results only at the end (no per-question reveal). */
  readonly immediate_feedback?: boolean
  readonly options?: readonly SessionQuestionOption[]
}

export interface SessionProgress {
  readonly current: number
  readonly total: number
}

/** Client → Server messages */
export interface WsAuthMessage {
  type: 'auth'
  token: string
}

export interface WsStartAction {
  action: 'start'
}

export interface WsAnswerAction {
  action: 'answer'
  question_id: number
  answer_data: { option_id?: number; option_ids?: number[]; text?: string }
}

export interface WsNextAction {
  action: 'next'
}

/** Server → Client events */
export interface WsAuthOkEvent {
  type: 'auth_ok'
  user_id: number
  username: string
}

export interface WsQuestionEvent {
  type: 'question'
  attempt_id: number
  question: SessionQuestion
  progress: SessionProgress
}

export interface WsAnswerResultEvent {
  type: 'answer_result'
  is_correct: boolean
  score_obtained: number
  explanation?: string
  correct_answer: Record<string, unknown>
}

export interface WsFinishEvent {
  type: 'finish'
  attempt_id: number
  total_score: number
  max_score: number
  duration_sec: number
}

export interface WsErrorEvent {
  type: 'error'
  code: string
  message: string
}
