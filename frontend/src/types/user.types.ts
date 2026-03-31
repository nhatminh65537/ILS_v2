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

/** User authentication status */
export interface User {
  readonly id: number
  readonly username: string
  readonly email: string
  readonly first_name: string
  readonly last_name: string
  readonly is_active: boolean
  readonly is_staff: boolean
  readonly is_superuser: boolean
  readonly created_at: string // ISO datetime
  readonly updated_at: string
}

/** User extended profile (one-to-one with User) */
export interface UserProfile {
  readonly id: number
  readonly user_id: number
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
  readonly created_at: string
  readonly updated_at: string
}

/** SSO provider link */
export type IdentityProvider = 'authentik' | 'gitlab' | 'github'

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
  readonly user_id: number
  readonly device_info?: string
  readonly refresh_token_hash: string // Never exposed to frontend
  readonly last_used_at?: string
  readonly expires_at?: string
  readonly revoked_at?: string
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
  readonly user: User
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

export interface UpdateProfilePayload {
  display_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  language?: string
  theme?: string
  timezone?: string
}
