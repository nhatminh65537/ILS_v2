export interface AdminStatsOverviewDto {
  readonly user_count: number
  readonly active_today: number
  readonly solves_week: number
  readonly registrations_week: number
  readonly courses_published: number
  readonly challenges_published: number
  readonly quizzes_published: number
}

export interface AdminStatsUserDto {
  readonly id: number
  readonly username: string
  readonly email: string
  readonly is_active: boolean
  readonly date_joined: string
  readonly last_login: string | null
  readonly display_name: string | null
  readonly avatar_url: string | null
  readonly last_active_at: string | null
}

export interface AdminStatsPointsDto {
  readonly learning: number
  readonly challenge: number
  readonly quiz: number
  readonly total: number
}

export interface AdminStatsCompletionDto {
  readonly courses_started: number
  readonly courses_completed: number
  readonly lessons_started: number
  readonly lessons_completed: number
  readonly challenges_completed: number
  readonly challenge_submits: number
  readonly challenge_correct_submits: number
  readonly quizzes_completed: number
  readonly quiz_attempts: number
  readonly quiz_best_score: number
}

export interface AdminStatsActivityDto {
  readonly last_active_at: string | null
  readonly last_course_started_at: string | null
  readonly last_course_completed_at: string | null
  readonly last_lesson_started_at: string | null
  readonly last_lesson_completed_at: string | null
  readonly last_challenge_completed_at: string | null
  readonly last_quiz_attempted_at: string | null
  readonly last_quiz_completed_at: string | null
}

export interface AdminStatsSessionDto {
  readonly total: number
  readonly active: number
  readonly revoked: number
  readonly latest_last_used_at: string | null
  readonly latest_expires_at: string | null
}

export interface AdminStatsUserDetailDto {
  readonly user: AdminStatsUserDto
  readonly points: AdminStatsPointsDto
  readonly completion: AdminStatsCompletionDto
  readonly activity: AdminStatsActivityDto
  readonly sessions: AdminStatsSessionDto
}
