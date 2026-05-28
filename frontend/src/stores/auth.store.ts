import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User } from '@/types/user.types'

const AUTH_STORAGE_KEY = 'ils-auth-storage'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

interface PersistedAuthSlice {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

interface AuthState extends PersistedAuthSlice {
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setTokens: (tokens: { accessToken: string | null; refreshToken: string | null }) => void
  setLoading: (isLoading: boolean) => void
  hydrateFromStorage: () => void
  clearAuth: () => void
  logout: () => void
}

const syncTokenStorage = (accessToken: string | null, refreshToken: string | null): void => {
  if (typeof window === 'undefined') {
    return
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

const AUTH_BROADCAST_CHANNEL = 'ils-auth'

const broadcastLogout = (): void => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return
  }
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    channel.postMessage({ type: 'logout' })
    channel.close()
  } catch {
    /* BroadcastChannel may be blocked in some environments — ignore */
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => {
        set({ user, isAuthenticated: Boolean(get().accessToken) })
      },
      setTokens: ({ accessToken, refreshToken }) => {
        syncTokenStorage(accessToken, refreshToken)
        set({
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken),
        })
      },
      setLoading: (isLoading) => {
        set({ isLoading })
      },
      hydrateFromStorage: () => {
        if (typeof window === 'undefined') {
          return
        }

        const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
        const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY)

        if (accessToken || refreshToken) {
          syncTokenStorage(accessToken, refreshToken)
          set({
            accessToken,
            refreshToken,
            isAuthenticated: Boolean(accessToken),
          })
          return
        }

        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
      clearAuth: () => {
        syncTokenStorage(null, null)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
        broadcastLogout()
      },
      logout: () => {
        get().clearAuth()
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuthSlice => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }

        syncTokenStorage(state.accessToken, state.refreshToken)
        state.isAuthenticated = Boolean(state.accessToken)
      },
    }
  )
)
