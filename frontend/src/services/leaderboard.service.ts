/**
 * Leaderboard service
 * Handles leaderboard queries and rankings
 */

import apiClient from '@/lib/axios'
import type { LeaderboardRequestParams, LeaderboardResponse } from '@/types/leaderboard.types'

/**
 * GET /api/stats/leaderboard/
 * Get leaderboard with canonical Slice 11 statistics contract.
 */
export const getLeaderboard = async (
  params: LeaderboardRequestParams
): Promise<LeaderboardResponse> => {
  const response = await apiClient.get('/api/stats/leaderboard/', { params })
  return response.data
}
