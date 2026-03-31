import { create } from 'zustand'
import type { Notification } from '@/types/notification.types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  setNotifications: (notifications: Notification[]) => void
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

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  ...initialState,
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((item) => !item.is_read).length
    set({ notifications, unreadCount })
  },
  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
      const unreadCount = notifications.filter((item) => !item.is_read).length
      return { notifications, unreadCount }
    })
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, is_read: true })),
      unreadCount: 0,
    }))
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
