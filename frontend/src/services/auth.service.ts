/**
 * Authentication service
 * Handles login, register, logout, SSO, and token refresh
 */

import apiClient from '@/lib/axios'
import type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  RefreshTokenPayload,
  TokenResponse,
  LogoutPayload,
  SsoRedirectResponse,
  SsoCallbackPayload,
  LinkIdentityPayload,
} from '@/types/user.types'

/**
 * POST /api/auth/register/
 * Creates user + profile, auto-assigns Member role
 */
export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/auth/register/', payload)
  return response.data
}

/**
 * POST /api/auth/login/
 * Local login with rate limiting
 */
export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/api/auth/login/', payload)
  return response.data
}

/**
 * POST /api/auth/token/refresh/
 * Refresh access token using refresh token
 * Handles token rotation and session management
 */
export const refreshToken = async (payload: RefreshTokenPayload): Promise<TokenResponse> => {
  const response = await apiClient.post('/api/auth/token/refresh/', payload)
  return response.data
}

/**
 * POST /api/auth/logout/
 * Revokes current session by refresh token hash
 */
export const logout = async (payload: LogoutPayload): Promise<void> => {
  await apiClient.post('/api/auth/logout/', payload)
}

/**
 * POST /api/auth/logout-all/
 * Revokes all active sessions for authenticated user
 */
export const logoutAll = async (): Promise<void> => {
  await apiClient.post('/api/auth/logout-all/')
}

/**
 * GET /api/auth/sso/redirect/
 * Builds OIDC authorization URL
 */
export const getSsoRedirectUrl = async (): Promise<SsoRedirectResponse> => {
  const response = await apiClient.get('/api/auth/sso/redirect/')
  return response.data
}

/**
 * GET /api/auth/sso/callback/
 * Validates OIDC state/nonce, exchanges code, links/creates user
 */
export const ssoCallback = async (payload: SsoCallbackPayload): Promise<AuthResponse> => {
  const response = await apiClient.get('/api/auth/sso/callback/', { params: payload })
  return response.data
}

/**
 * POST /api/auth/identity/link/
 * Links authenticated user to external identity
 */
export const linkIdentity = async (payload: LinkIdentityPayload): Promise<{ readonly success: boolean }> => {
  const response = await apiClient.post('/api/auth/identity/link/', payload)
  return response.data
}
