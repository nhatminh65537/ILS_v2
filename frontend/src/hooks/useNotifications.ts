'use client'

import { useCallback } from 'react'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import type { Notification } from '@/types/notification.types'
import { useNotificationSocket } from './useNotificationSocket'

type LoadNotificationsParams = {
  limit?: number
  offset?: number
  unread_only?: boolean
}

type UseNotificationsOptions = {
  enableRealtime?: boolean
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const enableRealtime = options.enableRealtime ?? true

  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const notifications = useNotificationsStore((state) => state.notifications)
  const unreadCount = useNotificationsStore((state) => state.unreadCount)
  const isLoading = useNotificationsStore((state) => state.isLoading)
  const error = useNotificationsStore((state) => state.error)

  const setNotifications = useNotificationsStore((state) => state.setNotifications)
  const upsertRealtimeNotification = useNotificationsStore((state) => state.upsertRealtimeNotification)
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount)
  const markAsRead = useNotificationsStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead)
  const setLoading = useNotificationsStore((state) => state.setLoading)
  const setError = useNotificationsStore((state) => state.setError)

  const loadNotifications = useCallback(
    async (params?: LoadNotificationsParams): Promise<void> => {
      if (!isAuthenticated) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await listNotifications(params)
        setNotifications([...response.results])
      } catch {
        setError('notifications.errors.loadFailed')
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated, setError, setLoading, setNotifications]
  )

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await getUnreadNotificationCount()
      setUnreadCount(response.count)
    } catch {
      setError('notifications.errors.unreadCountFailed')
    }
  }, [isAuthenticated, setError, setUnreadCount])

  const markNotificationAsRead = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await markNotificationRead(id)
        markAsRead(id)
        return true
      } catch {
        setError('notifications.errors.markReadFailed')
        return false
      }
    },
    [markAsRead, setError]
  )

  const markEveryNotificationAsRead = useCallback(async (): Promise<boolean> => {
    try {
      await markAllNotificationsRead()
      markAllAsRead()
      return true
    } catch {
      setError('notifications.errors.markAllReadFailed')
      return false
    }
  }, [markAllAsRead, setError])

  const handleRealtimeNotification = useCallback(
    (notification: Notification) => {
      upsertRealtimeNotification(notification)
    },
    [upsertRealtimeNotification]
  )

  const socket = useNotificationSocket({
    enabled: enableRealtime && isAuthenticated,
    token: accessToken,
    onNotification: handleRealtimeNotification,
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    refreshUnreadCount,
    markNotificationAsRead,
    markEveryNotificationAsRead,
    socketStatus: socket.status,
    socketErrorKey: socket.errorKey,
  }
}
