import { create } from 'zustand'
import type { Notification } from '@/types/notification.types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  setNotifications: (notifications: Notification[]) => void
  upsertRealtimeNotification: (notification: Notification) => void
  setUnreadCount: (count: number) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  notifications: [] as Notification[],
  unreadCount: 0,
  isLoading: false,
  error: null as string | null,
}

const sortNotifications = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort((left, right) => {
    if (left.is_read !== right.is_read) {
      return Number(left.is_read) - Number(right.is_read)
    }

    const leftTime = Date.parse(left.created_at)
    const rightTime = Date.parse(right.created_at)

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime
    }

    return right.id - left.id
  })
}

const computeUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter((item) => !item.is_read).length
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  ...initialState,
  setNotifications: (notifications) => {
    const sorted = sortNotifications(notifications)
    set({ notifications: sorted, unreadCount: computeUnreadCount(sorted) })
  },
  upsertRealtimeNotification: (notification) => {
    set((state) => {
      const existingIndex = state.notifications.findIndex((item) => item.id === notification.id)
      const nextItems =
        existingIndex >= 0
          ? state.notifications.map((item) => (item.id === notification.id ? notification : item))
          : [notification, ...state.notifications]

      const sorted = sortNotifications(nextItems)
      return {
        notifications: sorted,
        unreadCount: computeUnreadCount(sorted),
      }
    })
  },
  setUnreadCount: (count) => {
    set({ unreadCount: Math.max(0, count) })
  },
  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() } : item
      )
      const sorted = sortNotifications(notifications)
      return { notifications: sorted, unreadCount: computeUnreadCount(sorted) }
    })
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: sortNotifications(
        state.notifications.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      ),
      unreadCount: 0,
    }))
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
