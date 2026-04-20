/**
 * Notifications service
 * Handles notification listing, reading, and clearing
 */

import apiClient from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'
import type {
  AdminBroadcastHistoryItem,
  BroadcastNotificationPayload,
  BroadcastNotificationResponse,
  Notification,
} from '@/types/notification.types'

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
 * POST /api/notifications/{id}/mark-read/
 * Mark single notification as read
 */
export const markNotificationRead = async (id: number): Promise<{ readonly message: string }> => {
  const response = await apiClient.post(`/api/notifications/${id}/mark-read/`)
  return response.data
}

/**
 * POST /api/notifications/mark-all-read/
 * Mark all notifications as read for current user
 */
export const markAllNotificationsRead = async (): Promise<{ readonly updated_count: number }> => {
  const response = await apiClient.post('/api/notifications/mark-all-read/')
  return response.data
}

/**
 * GET /api/notifications/unread-count/
 * Fetch unread counter for current user
 */
export const getUnreadNotificationCount = async (): Promise<{ readonly count: number }> => {
  const response = await apiClient.get('/api/notifications/unread-count/')
  return response.data
}

/**
 * POST /api/admin/notifications/broadcast/
 * Create a manual broadcast for all active users (admin only).
 */
export const broadcastAdminNotification = async (
  payload: BroadcastNotificationPayload
): Promise<BroadcastNotificationResponse> => {
  const response = await apiClient.post('/api/admin/notifications/broadcast/', payload)
  return response.data
}

/**
 * GET /api/admin/notifications/history/
 * List grouped manual broadcast history rows (admin only).
 */
export const listAdminBroadcastHistory = async (params?: {
  limit?: number
  offset?: number
}): Promise<PaginatedResponse<AdminBroadcastHistoryItem>> => {
  const response = await apiClient.get('/api/admin/notifications/history/', { params })
  return response.data
}
