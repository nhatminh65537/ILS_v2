/**
 * Users service
 * Handles user CRUD, profile access, and user listing
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type { User, UserProfile, UpdateProfilePayload } from '@/types/user.types'

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
 * GET /api/users/profile/
 * Get current user profile (extended)
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/api/users/profile/')
  return response.data
}

/**
 * PATCH /api/users/update_profile/
 * Update current user profile
 */
export const updateMyProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const response = await apiClient.patch('/api/users/update_profile/', payload)
  return response.data
}
