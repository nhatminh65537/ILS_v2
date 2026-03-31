/**
 * Leaderboard service
 * Handles leaderboard queries and rankings
 */

import apiClient from '@/lib/axios'
import type { LeaderboardResponse, LeaderboardFilters } from '@/types/leaderboard.types'

/**
 * GET /api/leaderboard/
 * Get leaderboard with optional filtering and sorting
 */
export const getLeaderboard = async (params?: LeaderboardFilters): Promise<LeaderboardResponse> => {
  const response = await apiClient.get('/api/leaderboard/', { params })
  return response.data
}
