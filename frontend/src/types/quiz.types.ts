/**
 * Quiz domain types
 * Aligned with backend serializers (backend/api/serializers.py)
 * Source of truth: backend/api/models.py Quiz domain (lines 1006–1423)
 */

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
  readonly category_id?: number
  readonly quiz_point: number
  readonly total_questions: number
  readonly time_limit_sec?: number
  readonly tags?: readonly QuizTag[]
  readonly created_at: string
  readonly updated_at: string
}

/** Quiz tree node (for quiz organization) */
export interface QuizNode {
  readonly id: number
  readonly quiz_id: number
  readonly parent_id?: number
  readonly path: string // dot-separated: "1.2"
  readonly position: number
  readonly title: string
  readonly children?: readonly QuizNode[]
}

/**
 * Quiz question option
 * Matches QuizQuestionOptionSerializer (is_correct hidden from members)
 */
export interface QuizQuestionOption {
  readonly id: number
  readonly question_id: number
  readonly content: string
  readonly position: number
  readonly is_correct?: boolean // only present for editors/admins
}

/**
 * Quiz question
 * content is a JSON dict; content.text holds the question text
 * Matches QuizQuestionSerializer (member view) and QuizQuestionManageSerializer (editor view)
 */
export interface QuizQuestion {
  readonly id: number
  readonly quiz_id: number
  readonly content: Record<string, unknown> // { text: string, ... }
  readonly question_type: QuestionType
  readonly status: ContentStatus
  readonly position: number
  readonly score: number
  readonly case_sensitive: boolean
  readonly explanation?: string
  readonly options?: readonly QuizQuestionOption[]
  readonly created_at: string
  readonly updated_at: string
}

/**
 * User quiz attempt (REST response from start_attempt)
 * Matches UserQuizAttemptSerializer
 */
export interface QuizAttempt {
  readonly id: number
  readonly quiz: number
  readonly quiz_title: string
  readonly user: number
  readonly config: Record<string, unknown> // JSON snapshot of QuizConfig at start
  readonly started_at: string
  readonly finished_at?: string
  readonly total_score: number
  readonly is_finished: boolean
  readonly created_at: string
}

/** Individual answer to a question during attempt */
export interface QuizAnswer {
  readonly id: number
  readonly attempt_id: number
  readonly question_id: number
  readonly answer_data: Record<string, unknown>
  readonly score_obtained: number
  readonly created_at: string
}

/** User quiz progress (aggregate) */
export interface UserQuizProgress {
  readonly id: number
  readonly user_id: number
  readonly quiz_id: number
  readonly best_score: number
  readonly attempt_count: number
  readonly first_attempted_at?: string
  readonly last_attempted_at?: string
}

/**
 * Quiz config per user
 * Matches QuizConfigSerializer (backend/api/serializers.py lines 901–935)
 */
export interface QuizConfig {
  readonly id: number
  readonly quiz: number
  readonly user: number
  readonly total_questions: number // 0 = all questions
  readonly time_limit_sec: number // 0 = no limit
  readonly random_question: boolean
  readonly random_option: boolean
  readonly allow_review: boolean
  readonly allow_retry: boolean
  readonly max_attempt?: number // null = unlimited
  readonly is_default: boolean
  readonly is_active: boolean
}

/** Request/response payloads */
export interface CreateQuizPayload {
  title: string
  description?: string
  status: ContentStatus
  category_id?: number
  time_limit_sec?: number
  quiz_point?: number
}

export interface UpdateQuizPayload {
  title?: string
  description?: string
  status?: ContentStatus
  category_id?: number
  time_limit_sec?: number
  quiz_point?: number
}

export interface CreateQuestionPayload {
  quiz_id: number
  content: Record<string, unknown>
  question_type: QuestionType
  position: number
  score?: number
  case_sensitive?: boolean
  explanation?: string
}

/**
 * start_attempt response matches UserQuizAttemptSerializer
 * Questions arrive via WebSocket action: "start", not in this response
 */
export interface QuizAttemptResponse {
  readonly id: number // attempt id
  readonly quiz: number
  readonly quiz_title: string
  readonly user: number
  readonly config: Record<string, unknown>
  readonly started_at: string
  readonly finished_at?: string
  readonly total_score: number
  readonly is_finished: boolean
}

/**
 * submit_answer payload
 * answer_data shape depends on question_type:
 *   single_choice: { option_id: number }
 *   multi_choice:  { option_ids: number[] }
 *   fill_blank:    { text: string }
 */
export interface SubmitAnswerPayload {
  question_id: number
  answer_data: {
    option_id?: number
    option_ids?: number[]
    text?: string
  }
}

export interface SubmitAnswerResponse {
  readonly correct: boolean
  readonly score: number
  readonly explanation?: string
}

export interface QuizProgressResponse {
  readonly best_score: number
  readonly attempt_count: number
}
