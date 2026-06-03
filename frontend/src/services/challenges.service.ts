import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  AdminChallengeInstanceDto,
  AdminChallengeNodeCreatePayload,
  AdminChallengeNodeMovePayload,
  AdminChallengeNodeUpdatePayload,
  Challenge,
  ChallengeCategory,
  ChallengeCategoryMutationPayload,
  ChallengeExplorerResponse,
  ChallengeFlag,
  ChallengeFlagMutationPayload,
  ChallengeInstance,
  ChallengeNode,
  ChallengeProgressDetailResponse,
  ChallengeTag,
  ChallengeTagMutationPayload,
  CreateChallengePayload,
  FlagSubmissionResponse,
  GlobalChallengeProgressResponse,
  SubmitFlagPayload,
  UpdateChallengePayload,
} from '@/types/challenge.types'

export const listChallenges = async (params?: {
  limit?: number
  offset?: number
  status?: string
  difficulty?: string
  category?: number
  search?: string
  tags?: number[]
  solved?: boolean
}): Promise<PaginatedResponse<Challenge>> => {
  // Serialize array params the way the backend expects (comma-joined tag ids).
  const query: Record<string, unknown> = { ...(params ?? {}) }
  if (Array.isArray(params?.tags)) {
    if (params.tags.length > 0) {
      query.tags = params.tags.join(',')
    } else {
      delete query.tags
    }
  }
  const response = await apiClient.get('/api/challenge/challenges/', { params: query })
  return response.data
}

/** File-explorer contents at the root (no folderId) or inside a folder. */
export const listChallengeFolderContents = async (
  folderId?: number | null
): Promise<ChallengeExplorerResponse> => {
  const url =
    folderId == null
      ? '/api/challenge/nodes/explorer/'
      : `/api/challenge/nodes/${folderId}/explorer/`
  const response = await apiClient.get(url)
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

// ── Admin: Category CRUD ──────────────────────────────────────────────────────

export const listChallengeCategories = async (): Promise<ChallengeCategory[]> => {
  const response = await apiClient.get('/api/challenge/categories/')
  return response.data?.results ?? response.data
}

export const createChallengeCategory = async (payload: ChallengeCategoryMutationPayload): Promise<ChallengeCategory> => {
  const response = await apiClient.post('/api/challenge/categories/', payload)
  return response.data
}

export const updateChallengeCategory = async (id: number, payload: ChallengeCategoryMutationPayload): Promise<ChallengeCategory> => {
  const response = await apiClient.patch(`/api/challenge/categories/${id}/`, payload)
  return response.data
}

export const deleteChallengeCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/challenge/categories/${id}/`)
}

// ── Admin: Tag CRUD ───────────────────────────────────────────────────────────

export const listChallengeTags = async (): Promise<ChallengeTag[]> => {
  const response = await apiClient.get('/api/challenge/tags/')
  return response.data?.results ?? response.data
}

export const createChallengeTag = async (payload: ChallengeTagMutationPayload): Promise<ChallengeTag> => {
  const response = await apiClient.post('/api/challenge/tags/', payload)
  return response.data
}

export const updateChallengeTag = async (id: number, payload: ChallengeTagMutationPayload): Promise<ChallengeTag> => {
  const response = await apiClient.patch(`/api/challenge/tags/${id}/`, payload)
  return response.data
}

export const deleteChallengeTag = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/challenge/tags/${id}/`)
}

// ── Admin: Node (tree) CRUD ───────────────────────────────────────────────────

export const listChallengeRootNodes = async (): Promise<ChallengeNode[]> => {
  const response = await apiClient.get('/api/challenge/nodes/')
  return response.data?.results ?? response.data
}

export const listChallengeNodeChildren = async (nodeId: number): Promise<ChallengeNode[]> => {
  const response = await apiClient.get(`/api/challenge/nodes/${nodeId}/children/`)
  return response.data?.results ?? response.data
}

export const createChallengeNode = async (payload: AdminChallengeNodeCreatePayload): Promise<ChallengeNode> => {
  const response = await apiClient.post('/api/challenge/nodes/', payload)
  return response.data
}

export const updateChallengeNode = async (id: number, payload: AdminChallengeNodeUpdatePayload): Promise<ChallengeNode> => {
  const response = await apiClient.patch(`/api/challenge/nodes/${id}/`, payload)
  return response.data
}

export const deleteChallengeNode = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/challenge/nodes/${id}/`)
}

export const moveChallengeNode = async (id: number, payload: AdminChallengeNodeMovePayload): Promise<ChallengeNode> => {
  const response = await apiClient.post(`/api/challenge/nodes/${id}/move/`, payload)
  return response.data
}

// ── Admin: Flag CRUD ──────────────────────────────────────────────────────────

export const createChallengeFlag = async (slug: string, payload: ChallengeFlagMutationPayload): Promise<ChallengeFlag> => {
  const response = await apiClient.post(`/api/challenge/challenges/${slug}/flags/`, payload)
  return response.data
}

export const updateChallengeFlag = async (slug: string, flagId: number, payload: ChallengeFlagMutationPayload): Promise<ChallengeFlag> => {
  const response = await apiClient.patch(`/api/challenge/challenges/${slug}/flags/${flagId}/`, payload)
  return response.data
}

export const deleteChallengeFlag = async (slug: string, flagId: number): Promise<void> => {
  await apiClient.delete(`/api/challenge/challenges/${slug}/flags/${flagId}/`)
}

// ── Admin: Instance management ────────────────────────────────────────────────

export const listAdminChallengeInstances = async (params?: {
  challenge_slug?: string
  user_id?: number
  status?: string
}): Promise<PaginatedResponse<AdminChallengeInstanceDto>> => {
  const response = await apiClient.get('/api/challenge/instances/', { params })
  return response.data
}

export const killChallengeInstance = async (instanceId: number): Promise<void> => {
  await apiClient.post(`/api/challenge/instances/${instanceId}/kill/`)
}
