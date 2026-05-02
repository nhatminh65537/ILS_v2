/**
 * Challenge domain types
 * Derived from DATA_MODEL.md Challenge Domain section
 */

export enum ChallengeDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
  Insane = 'insane',
}

export enum ChallengeSource {
  Manual = 'manual',
  GitLab = 'gitlab',
}

export enum InstanceStatus {
  Running = 'running',
  Stopped = 'stopped',
  Terminated = 'terminated',
}

/** Challenge category */
export interface ChallengeCategory {
  readonly id: number
  readonly name: string
  readonly description?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Challenge tag */
export interface ChallengeTag {
  readonly id: number
  readonly name: string
  readonly description?: string
}

/** Core challenge entity */
export interface Challenge {
  readonly id: number
  readonly slug: string
  readonly title: string
  readonly description?: string
  readonly status: 'draft' | 'published' | 'archived'
  readonly difficulty?: ChallengeDifficulty
  /** FK integer from list endpoint */
  readonly category?: number | ChallengeCategory | null
  /** Convenience string from list serializer */
  readonly category_name?: string
  readonly source: ChallengeSource
  readonly storage_path: string
  readonly gitlab_path?: string
  readonly challenge_point: number
  readonly instance_required: boolean
  readonly tags?: readonly ChallengeTag[]
  readonly created_at: string
  readonly updated_at: string
}

/** Challenge tree node */
export interface ChallengeNode {
  readonly id: number
  readonly challenge_id: number
  readonly parent_id?: number
  readonly path: string // dot-separated: "1.2"
  readonly position: number
  readonly title: string
  readonly children?: readonly ChallengeNode[]
}

/** Challenge flag (answer template) */
export interface ChallengeFlag {
  readonly id: number
  readonly challenge_id: number
  readonly flag_value: string // NOT returned in GET for Members
  readonly flag_type: 'static' | 'regex' | 'instance'
  readonly created_at: string
}

/** User challenge progress + submission */
export interface UserChallengeProgress {
  readonly id: number
  readonly user_id: number
  readonly challenge_id: number
  readonly solved: boolean
  readonly attempt_count: number
  readonly first_solved_at?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Challenge submission (flag attempt) */
export interface ChallengeSubmission {
  readonly id: number
  readonly user_id: number
  readonly challenge_id: number
  readonly flag_submitted: string
  readonly is_correct: boolean
  readonly created_at: string
}

/** Challenge instance (for instance-based challenges) */
export interface ChallengeInstance {
  readonly id: number
  readonly user_id: number
  readonly challenge_id: number
  readonly challenge_flag_id: number
  readonly status: InstanceStatus
  readonly instance_info?: Record<string, unknown>
  readonly expires_at?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Request/response payloads */
export interface CreateChallengePayload {
  title: string
  slug: string
  description?: string
  status: 'draft' | 'published'
  difficulty?: ChallengeDifficulty
  category_id?: number
  source: ChallengeSource
  challenge_point?: number
  instance_required?: boolean
}

export interface UpdateChallengePayload {
  title?: string
  description?: string
  status?: 'draft' | 'published' | 'archived'
  difficulty?: ChallengeDifficulty
  category_id?: number
  challenge_point?: number
  instance_required?: boolean
}

export interface SubmitFlagPayload {
  flag: string
}

export interface FlagSubmissionResponse {
  readonly correct: boolean
  readonly message?: string
}

export interface CreateInstancePayload {
  challenge_id: number
}

/** Per-challenge progress for current user (Task 6.6 endpoint) */
export interface ChallengeProgressDetailResponse {
  readonly is_solved: boolean
  readonly attempt_count: number
  readonly completed_at: string | null
}

/** Global aggregate progress for current user */
export interface GlobalChallengeProgressResponse {
  readonly solved_count: number
  readonly total_attempts: number
}
