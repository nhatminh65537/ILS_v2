/**
 * Notifications service
 * Handles notification listing, reading, and clearing
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type { Notification } from '@/types/notification.types'

/**
 * GET /api/notifications/
 * List notifications for current user (unread first, includes broadcasts)
 */
export const listNotifications = async (params?: {
  limit?: number
  offset?: number
  unread_only?: boolean
}): Promise<PaginatedResponse<Notification>> => {
  const response = await apiClient.get('/api/notifications/', { params })
  return response.data
}

/**
 * GET /api/notifications/{id}/
 * Get notification detail
 */
export const getNotificationById = async (id: number): Promise<Notification> => {
  const response = await apiClient.get(`/api/notifications/${id}/`)
  return response.data
}

/**
 * POST /api/notifications/{id}/mark_read/
 * Mark single notification as read
 */
export const markNotificationRead = async (id: number): Promise<Notification> => {
  const response = await apiClient.post(`/api/notifications/${id}/mark_read/`)
  return response.data
}

/**
 * POST /api/notifications/mark_all_read/
 * Mark all notifications as read for current user
 */
export const markAllNotificationsRead = async (): Promise<{ readonly count: number }> => {
  const response = await apiClient.post('/api/notifications/mark_all_read/')
  return response.data
}
