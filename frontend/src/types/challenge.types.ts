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
  /** Present on the flat-search list serializer; true when the requester solved it. */
  readonly is_solved?: boolean
  readonly created_at: string
  readonly updated_at: string
}

/** Challenge tree node */
export interface ChallengeNode {
  readonly id: number
  /** null = folder; set = challenge item node (FK id from the serializer) */
  readonly challenge: number | null
  /** Slug of the linked challenge (item nodes only); used to navigate to the editor. */
  readonly challenge_slug?: string | null
  readonly parent?: number | null
  readonly path: string // dot-separated: "1.2"
  readonly position: number
  readonly title: string
  /** true when challenge is set (item node); false = folder */
  readonly is_item: boolean
  readonly has_children?: boolean
  readonly children?: readonly ChallengeNode[]
}

/**
 * Derived flag "kind" label. The backend has no `flag_type` column — the kind
 * is inferred from `is_regex` / `random_tail_length` (see DATA_MODEL.md).
 */
export type ChallengeFlagType = 'static' | 'regex' | 'instance'

/** Infer a flag's display "kind" from its actual backend fields. */
export function deriveFlagType(flag: Pick<ChallengeFlag, 'is_regex' | 'random_tail_length'>): ChallengeFlagType {
  if (flag.is_regex) return 'regex'
  if (flag.random_tail_length > 0) return 'instance'
  return 'static'
}

/** Challenge flag (answer template) */
export interface ChallengeFlag {
  readonly id: number
  readonly challenge_id: number
  readonly flag_value: string // NOT returned in GET for Members
  readonly is_regex: boolean
  readonly is_case_sensitive: boolean
  readonly random_tail_length: number
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
  category_id?: number | null
  tag_ids?: number[]
  source: ChallengeSource
  challenge_point?: number
  instance_required?: boolean
}

export interface UpdateChallengePayload {
  title?: string
  description?: string
  status?: 'draft' | 'published' | 'archived'
  difficulty?: ChallengeDifficulty
  category_id?: number | null
  tag_ids?: number[]
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

/** Challenge summary embedded in a file-explorer item node. */
export interface ChallengeExplorerSummary {
  readonly id: number
  readonly slug: string
  readonly title: string
  readonly difficulty?: ChallengeDifficulty
  readonly status: 'draft' | 'published' | 'archived'
  readonly challenge_point: number
  readonly instance_required: boolean
  readonly category_name?: string | null
  readonly tags?: readonly ChallengeTag[]
  readonly is_solved: boolean
}

/** One node (folder or challenge item) in the file-explorer. */
export interface ChallengeExplorerNode {
  readonly id: number
  readonly is_item: boolean
  readonly title: string
  readonly path: string
  readonly challenge: ChallengeExplorerSummary | null
}

/** A breadcrumb crumb for explorer navigation. */
export interface ChallengeBreadcrumbCrumb {
  readonly id: number
  readonly title: string
}

/** Response of the explorer endpoints (root or folder). */
export interface ChallengeExplorerResponse {
  readonly folder: { id: number; title: string; path: string } | null
  readonly breadcrumb: readonly ChallengeBreadcrumbCrumb[]
  readonly nodes: readonly ChallengeExplorerNode[]
}

/** Global aggregate progress for current user */
export interface GlobalChallengeProgressResponse {
  readonly solved_count: number
  readonly total_attempts: number
}

// ── Admin payload types ───────────────────────────────────────────────────────

export interface ChallengeCategoryMutationPayload {
  name: string
  description?: string
}

export interface ChallengeTagMutationPayload {
  name: string
  description?: string
}

export interface ChallengeFlagMutationPayload {
  flag_value: string
  is_regex?: boolean
  is_case_sensitive?: boolean
  random_tail_length?: number
}

export interface AdminChallengeNodeCreatePayload {
  title: string
  parent_id: number | null
  /** Folder = false; item auto-creates a draft Challenge from the title. */
  is_item: boolean
}

export interface AdminChallengeNodeUpdatePayload {
  title?: string
}

export interface AdminChallengeNodeMovePayload {
  parent_id: number | null
}

/** Admin-facing instance with user/challenge display names */
export interface AdminChallengeInstanceDto {
  readonly id: number
  readonly user_id: number
  readonly user_username: string
  readonly challenge_id: number
  readonly challenge_slug: string
  readonly challenge_title: string
  readonly status: InstanceStatus
  readonly instance_info?: Record<string, unknown>
  readonly expires_at?: string
  readonly created_at: string
  readonly updated_at: string
}
