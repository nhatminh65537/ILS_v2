import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  Challenge,
  ChallengeFlag,
  CreateChallengePayload,
  UpdateChallengePayload,
  SubmitFlagPayload,
  FlagSubmissionResponse,
  ChallengeInstance,
  ChallengeProgressDetailResponse,
  GlobalChallengeProgressResponse,
} from '@/types/challenge.types'

export const listChallenges = async (params?: {
  limit?: number
  offset?: number
  status?: string
  difficulty?: string
  category?: number
  search?: string
  tags?: number[]
}): Promise<PaginatedResponse<Challenge>> => {
  const response = await apiClient.get('/api/challenge/challenges/', { params })
  return response.data
}

export const createChallenge = async (payload: CreateChallengePayload): Promise<Challenge> => {
  const response = await apiClient.post('/api/challenge/challenges/', payload)
  return response.data
}

export const getChallengeBySlug = async (slug: string): Promise<Challenge> => {
  const response = await apiClient.get(`/api/challenge/challenges/${slug}/`)
  return response.data
}

export const updateChallenge = async (slug: string, payload: UpdateChallengePayload): Promise<Challenge> => {
  const response = await apiClient.patch(`/api/challenge/challenges/${slug}/`, payload)
  return response.data
}

export const deleteChallenge = async (slug: string): Promise<void> => {
  await apiClient.delete(`/api/challenge/challenges/${slug}/`)
}

export const getChallengeFlags = async (slug: string): Promise<readonly ChallengeFlag[]> => {
  const response = await apiClient.get(`/api/challenge/challenges/${slug}/flags/`)
  return response.data
}

export const submitFlag = async (slug: string, payload: SubmitFlagPayload): Promise<FlagSubmissionResponse> => {
  const response = await apiClient.post(`/api/challenge/challenges/${slug}/submit/`, payload)
  return response.data
}

export const getChallengeProgress = async (slug: string): Promise<ChallengeProgressDetailResponse> => {
  const response = await apiClient.get(`/api/challenge/challenges/${slug}/progress/`)
  return response.data
}

export const getGlobalProgress = async (): Promise<GlobalChallengeProgressResponse> => {
  const response = await apiClient.get('/api/challenge/progress/')
  return response.data
}

export const startInstance = async (slug: string): Promise<ChallengeInstance> => {
  const response = await apiClient.post(`/api/challenge/challenges/${slug}/instance/start/`)
  return response.data
}

export const stopInstance = async (slug: string): Promise<void> => {
  await apiClient.post(`/api/challenge/challenges/${slug}/instance/stop/`)
}

export const getInstanceStatus = async (slug: string): Promise<ChallengeInstance | { status: 'none' }> => {
  const response = await apiClient.get(`/api/challenge/challenges/${slug}/instance/status/`)
  return response.data
}
