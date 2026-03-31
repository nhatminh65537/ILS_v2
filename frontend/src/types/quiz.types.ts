/**
 * Quiz domain types
 * Derived from DATA_MODEL.md Quiz Domain section
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
}

/** Core quiz entity */
export interface Quiz {
  readonly id: number
  readonly title: string
  readonly description?: string
  readonly status: ContentStatus
  readonly category_id?: number
  readonly time_limit_seconds?: number
  readonly pass_score_percent?: number
  readonly is_shuffled: boolean
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

/** Quiz question (with options embedded) */
export interface QuizQuestion {
  readonly id: number
  readonly quiz_id: number
  readonly question_text: string
  readonly question_type: QuestionType
  readonly position: number
  readonly case_sensitive: boolean
  readonly explanation?: string
  readonly options?: readonly QuizQuestionOption[]
  readonly correct_answer?: string // for fill_blank
  readonly created_at: string
}

export interface QuizQuestionOption {
  readonly id: number
  readonly question_id: number
  readonly text: string
  readonly position: number
  readonly is_correct: boolean
}

/** User quiz attempt (WebSocket session) */
export interface QuizAttempt {
  readonly id: number
  readonly user_id: number
  readonly quiz_id: number
  readonly started_at: string
  readonly finished_at?: string
  readonly score?: number
  readonly created_at: string
}

/** Individual answer to a question during attempt */
export interface QuizAnswer {
  readonly id: number
  readonly attempt_id: number
  readonly question_id: number
  readonly answer_text?: string
  readonly selected_options?: readonly number[]
  readonly is_correct: boolean
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

/** Quiz config per user */
export interface QuizConfig {
  readonly id: number
  readonly quiz_id: number
  readonly user_id: number
  readonly show_answers: boolean
  readonly show_explanations: boolean
}

/** Request/response payloads */
export interface CreateQuizPayload {
  title: string
  description?: string
  status: ContentStatus
  category_id?: number
  time_limit_seconds?: number
  pass_score_percent?: number
  is_shuffled?: boolean
}

export interface UpdateQuizPayload {
  title?: string
  description?: string
  status?: ContentStatus
  category_id?: number
  time_limit_seconds?: number
  pass_score_percent?: number
  is_shuffled?: boolean
}

export interface CreateQuestionPayload {
  quiz_id: number
  question_text: string
  question_type: QuestionType
  position: number
  case_sensitive?: boolean
  explanation?: string
}

export interface StartAttemptPayload {
  quiz_id: number
}

export interface SubmitAnswerPayload {
  answer_text?: string // for fill_blank
  selected_options?: readonly number[] // for single/multi_choice
}

export interface SubmitAnswerResponse {
  readonly is_correct: boolean
  readonly explanation?: string
  readonly next_question?: QuizQuestion
  readonly attempt_finished?: boolean
  readonly final_score?: number
}

export interface QuizAttemptResponse {
  readonly attempt_id: number
  readonly quiz_id: number
  readonly first_question: QuizQuestion
}

export interface QuizProgressResponse {
  readonly best_score: number
  readonly attempt_count: number
  readonly pass_score_percent: number
}
