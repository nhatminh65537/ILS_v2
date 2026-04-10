/**
 * Users service
 * Handles user CRUD, profile access, and user listing
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  ActivityEvent,
  MeAccountUpdatePayload,
  MeSettingsUpdatePayload,
  PublicProfileResponse,
  UpdateProfilePayload,
  User,
  UserProfile,
} from '@/types/user.types'

/**
 * GET /api/users/
 * List all users (requires auth)
 */
export const listUsers = async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>> => {
  const response = await apiClient.get('/api/users/', { params })
  return response.data
}

/**
 * POST /api/users/
 * Create new user
 */
export const createUser = async (payload: {
  username: string
  email?: string
  password?: string
}): Promise<User> => {
  const response = await apiClient.post('/api/users/', payload)
  return response.data
}

/**
 * GET /api/users/{id}/
 * Get specific user by ID
 */
export const getUserById = async (id: number): Promise<User> => {
  const response = await apiClient.get(`/api/users/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/users/{id}/
 * Update user
 */
export const updateUser = async (
  id: number,
  payload: Partial<{
    username: string
    email: string
    first_name: string
    last_name: string
    is_active: boolean
  }>
): Promise<User> => {
  const response = await apiClient.patch(`/api/users/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/users/{id}/
 * Delete user
 */
export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/users/${id}/`)
}

/**
 * GET /api/users/me/
 * Get current authenticated user
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get('/api/users/me/')
  return response.data
}

/**
 * GET /api/users/me/profile/
 * Get current user profile with stats
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/api/users/me/profile/')
  return response.data
}

/**
 * PATCH /api/users/me/profile/
 * Update current user profile fields (display_name, bio, avatar_url, location, website, entry_year)
 */
export const updateMyProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const response = await apiClient.patch('/api/users/me/profile/', payload)
  return response.data
}

/**
 * PATCH /api/users/me/settings/
 * Update current user settings (language, theme, timezone)
 */
export const updateMySettings = async (payload: MeSettingsUpdatePayload): Promise<UserProfile> => {
  const response = await apiClient.patch('/api/users/me/settings/', payload)
  return response.data
}

/**
 * PATCH /api/users/me/account/
 * Update current user account info (username, email)
 * Returns User object (not UserProfile)
 */
export const updateMyAccount = async (payload: MeAccountUpdatePayload): Promise<User> => {
  const response = await apiClient.patch('/api/users/me/account/', payload)
  return response.data
}

/**
 * GET /api/users/me/activity/
 * Get current user activity feed (last 30 events)
 */
export const getMyActivity = async (): Promise<ActivityEvent[]> => {
  const response = await apiClient.get('/api/users/me/activity/')
  return response.data
}

/**
 * GET /api/users/{username}/profile/
 * Get public profile for any user by username
 */
export const getPublicProfile = async (username: string): Promise<PublicProfileResponse> => {
  const response = await apiClient.get(`/api/users/${username}/profile/`)
  return response.data
}

/**
 * GET /api/users/{username}/activity/
 * Get public activity feed for any user by username (last 30 events)
 */
export const getPublicActivity = async (username: string): Promise<ActivityEvent[]> => {
  const response = await apiClient.get(`/api/users/${username}/activity/`)
  return response.data
}
