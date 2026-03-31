/**
 * Challenges service
 * Handles challenge CRUD, flag submission, instances, and progress tracking
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Challenge,
  ChallengeNode,
  ChallengeFlag,
  CreateChallengePayload,
  UpdateChallengePayload,
  SubmitFlagPayload,
  FlagSubmissionResponse,
  ChallengeInstance,
  ChallengeProgressResponse,
} from '@/types/challenge.types'

/**
 * GET /api/challenges/
 * List challenges with optional filters (status, difficulty, category, search)
 */
export const listChallenges = async (params?: {
  limit?: number
  offset?: number
  status?: string
  difficulty?: string
  category?: number
  search?: string
}): Promise<PaginatedResponse<Challenge>> => {
  const response = await apiClient.get('/api/challenges/', { params })
  return response.data
}

/**
 * POST /api/challenges/
 * Create new challenge (Editor+)
 */
export const createChallenge = async (payload: CreateChallengePayload): Promise<Challenge> => {
  const response = await apiClient.post('/api/challenges/', payload)
  return response.data
}

/**
 * GET /api/challenges/{id}/
 * Get challenge detail
 */
export const getChallengeById = async (id: number): Promise<Challenge> => {
  const response = await apiClient.get(`/api/challenges/${id}/`)
  return response.data
}

/**
 * PUT/PATCH /api/challenges/{id}/
 * Update challenge
 */
export const updateChallenge = async (id: number, payload: UpdateChallengePayload): Promise<Challenge> => {
  const response = await apiClient.patch(`/api/challenges/${id}/`, payload)
  return response.data
}

/**
 * DELETE /api/challenges/{id}/
 * Delete challenge
 */
export const deleteChallenge = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/challenges/${id}/`)
}

/**
 * GET /api/challenges/{id}/tree/
 * Get challenge tree structure
 */
export const getChallengeTree = async (id: number, params?: { parent?: number }): Promise<readonly ChallengeNode[]> => {
  const response = await apiClient.get(`/api/challenges/${id}/tree/`, { params })
  return response.data
}

/**
 * GET /api/challenges/{id}/flags/
 * Get challenge flags (Admin/Editor only, values masked from Members)
 */
export const getChallengeFlags = async (id: number): Promise<readonly ChallengeFlag[]> => {
  const response = await apiClient.get(`/api/challenges/${id}/flags/`)
  return response.data
}

/**
 * POST /api/challenges/{id}/submit_flag/
 * Submit flag attempt for challenge (server-side validation)
 */
export const submitFlag = async (id: number, payload: SubmitFlagPayload): Promise<FlagSubmissionResponse> => {
  const response = await apiClient.post(`/api/challenges/${id}/submit_flag/`, payload)
  return response.data
}

/**
 * GET /api/challenges/{id}/progress/
 * Get user progress on challenge
 */
export const getChallengeProgress = async (id: number): Promise<ChallengeProgressResponse> => {
  const response = await apiClient.get(`/api/challenges/${id}/progress/`)
  return response.data
}

/**
 * POST /api/challenges/{id}/create_instance/
 * Create challenge instance for instance-based challenges
 */
export const createChallengeInstance = async (id: number): Promise<ChallengeInstance> => {
  const response = await apiClient.post(`/api/challenges/${id}/create_instance/`)
  return response.data
}
