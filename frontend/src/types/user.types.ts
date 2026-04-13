/**
 * User domain types
 * Derived from DATA_MODEL.md User Domain section
 */

/** User role enum */
export enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Member = 'member',
}

/** Minimal auth user payload returned by auth endpoints */
export interface AuthUser {
  readonly id: number
  readonly username: string
  readonly email: string
}

/** User authentication status */
export interface User {
  readonly id: number
  readonly username: string
  readonly email: string
  readonly first_name?: string
  readonly last_name?: string
  readonly is_active?: boolean
  readonly is_staff?: boolean
  readonly is_superuser?: boolean
  readonly date_joined?: string // ISO datetime
  readonly last_login?: string | null
  readonly created_at?: string
  readonly updated_at?: string
}

/** User extended profile (one-to-one with User) — matches UserProfileSerializer */
export interface UserProfile {
  readonly user_id: number
  readonly username: string
  readonly entry_year?: number
  readonly display_name?: string
  readonly avatar_url?: string
  readonly bio?: string
  readonly location?: string
  readonly website?: string
  readonly language: string // 'vi' | 'en'
  readonly theme: string // 'system' | 'light' | 'dark'
  readonly timezone: string // 'UTC'
  readonly total_learning_point: number
  readonly total_challenge_point: number
  readonly total_quiz_point: number
  readonly course_completed: number
  readonly challenge_completed: number
  readonly quiz_completed: number
  readonly last_active_at?: string
}

/**
 * Public profile response from GET /api/users/{username}/profile/
 * Subset of UserProfile — no user_id, no internal fields
 */
export interface PublicProfileResponse {
  readonly username: string
  readonly entry_year?: number | null
  readonly display_name?: string | null
  readonly avatar_url?: string | null
  readonly bio?: string | null
  readonly location?: string | null
  readonly website?: string | null
  readonly total_learning_point: number
  readonly total_challenge_point: number
  readonly total_quiz_point: number
  readonly course_completed: number
  readonly challenge_completed: number
  readonly quiz_completed: number
  readonly last_active_at?: string | null
}

/**
 * Activity event from /api/users/me/activity/ or /api/users/{username}/activity/
 * Matches ActivityEventSerializer fields exactly
 */
export interface ActivityEvent {
  readonly type: 'lesson_complete' | 'challenge_solve' | 'quiz_complete'
  readonly timestamp: string // ISO datetime
  readonly item_title: string | null
  readonly source_id: number | null
}

/** SSO provider link */
export type IdentityProvider = 'authentik' | 'google' | 'github'

export interface UserIdentity {
  readonly id: number
  readonly user_id: number
  readonly provider: IdentityProvider
  readonly external_id: string
  readonly extra_data?: Record<string, unknown>
  readonly is_primary: boolean
  readonly is_active: boolean
  readonly created_at: string
  readonly updated_at: string
}

/** Refresh token session (multi-device tracking) */
export interface UserSession {
  readonly id: number
  readonly user: number
  readonly device_info?: string
  readonly refresh_token_hash: string // Never exposed to frontend
  readonly last_used_at?: string
  readonly expires_at?: string
  readonly revoked_at?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Session list payload item from GET /api/auth/sessions/ */
export interface AuthSessionListItem {
  readonly id: number
  readonly device_info?: string
  readonly last_used_at?: string
  readonly expires_at?: string
  readonly created_at: string
}

/** Auth request/response payloads */
export interface RegisterPayload {
  username: string
  email?: string
  password: string // min 8 chars
}

export interface LoginPayload {
  username: string
  password: string
}

export interface AuthResponse {
  readonly access: string // JWT access token
  readonly refresh: string // Refresh token (plaintext, store in memory/localStorage)
  readonly user: AuthUser
}

export interface RefreshTokenPayload {
  refresh: string
}

export interface TokenResponse {
  readonly access: string
  readonly refresh: string
}

export interface LogoutPayload {
  refresh: string
}

export interface SsoRedirectResponse {
  readonly redirect_url: string
}

export interface SsoCallbackPayload {
  code: string
  state: string
}

export interface LinkIdentityPayload {
  provider: IdentityProvider
  external_id: string
}

export interface LinkIdentityResponse {
  readonly detail: string
  readonly provider: IdentityProvider
  readonly external_id: string
  readonly created: boolean
}

export interface UpdateProfilePayload {
  display_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  entry_year?: number | null
}

/** Payload for PATCH /api/users/me/settings/ */
export interface MeSettingsUpdatePayload {
  language?: string
  theme?: string
  timezone?: string
}

/** Payload for PATCH /api/users/me/account/ */
export interface MeAccountUpdatePayload {
  username?: string
  email?: string
}

// ---------------------------------------------------------------------------
// Admin user management types (Task 8.4)
// Derived from AdminUserManagementSerializer in backend/api/serializers.py
// ---------------------------------------------------------------------------

/** Role summary as returned by admin user list/detail endpoints */
export interface AdminRoleSummaryDto {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly is_system: boolean
}

/** Full admin user record returned by GET /api/admin/users/ and GET /api/admin/users/{id}/ */
export interface AdminUserDto {
  readonly id: number
  readonly username: string
  readonly email: string
  readonly first_name?: string
  readonly last_name?: string
  readonly is_active: boolean
  readonly is_staff: boolean
  readonly is_superuser: boolean
  readonly date_joined: string // ISO datetime
  readonly last_login: string | null
  readonly profile: UserProfile | null
  readonly roles: AdminRoleSummaryDto[]
}

/** Query params accepted by GET /api/admin/users/ */
export interface AdminUserListParams {
  is_active?: boolean
  date_joined_from?: string
  date_joined_to?: string
  limit?: number
  offset?: number
}

/** Payload for POST /api/admin/users/ */
export interface AdminUserCreatePayload {
  username: string
  email?: string
  password?: string
  role_ids?: number[]
}

/** Payload for PATCH /api/admin/users/{id}/ */
export interface AdminUserUpdatePayload {
  is_active?: boolean
  role_ids?: number[]
  username?: string
  email?: string
}
