/**
 * Leaderboard domain types
 * Derived from DATA_MODEL.md Leaderboard Domain section
 */

/** Leaderboard entry (ranks users by points) */
export interface LeaderboardEntry {
  readonly id: number
  readonly user_id: number
  readonly username: string
  readonly display_name?: string
  readonly avatar_url?: string
  readonly rank: number
  readonly total_learning_point: number
  readonly total_challenge_point: number
  readonly total_quiz_point: number
  readonly total_points: number // sum of above three
  readonly courses_completed: number
  readonly challenges_completed: number
  readonly quizzes_completed: number
}

/** Request/response payloads */
export interface LeaderboardFilters {
  limit?: number
  offset?: number
  sort_by?: 'total' | 'learning' | 'challenge' | 'quiz'
}

export interface LeaderboardResponse {
  readonly total_count: number
  readonly entries: readonly LeaderboardEntry[]
}
