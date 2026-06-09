/**
 * Leaderboard domain types
 * Derived from backend leaderboard serializer contract.
 */

export type LeaderboardType = 'overall' | 'challenge' | 'quiz' | 'course'

export interface LeaderboardUser {
  readonly id: number
  readonly username: string
  readonly display_name: string | null
  readonly avatar_url: string | null
  readonly avatar: string | null
}

/** Leaderboard entry (ranks users by points) */
export interface LeaderboardEntry {
  readonly rank: number
  readonly user: LeaderboardUser
  readonly score: number
  readonly delta: number
  /** Completed item count for the active board type (course/challenge/quiz; overall = sum). */
  readonly completed?: number
}

/** Request payloads */
export interface LeaderboardRequestParams {
  readonly type: LeaderboardType
  readonly page?: number
  readonly limit?: number
  readonly offset?: number
}

export interface LeaderboardResponse {
  readonly type: LeaderboardType
  readonly my_rank: number | null
  readonly total_users: number
  readonly total_count: number
  readonly page: number
  readonly page_size: number
  readonly results: readonly LeaderboardEntry[]
  readonly entries?: readonly LeaderboardEntry[]
}
