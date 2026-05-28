'use client'

import { useCallback, useEffect } from 'react'
import { mapAuthErrorToMessageKey } from '@/lib/auth-error-map'
import { login as loginService, logout as logoutService, register as registerService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginPayload, RegisterPayload } from '@/types/user.types'

interface AuthActionResult {
  success: boolean
  messageKey?: string
}

export const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setUser = useAuthStore((state) => state.setUser)
  const setTokens = useAuthStore((state) => state.setTokens)
  const setLoading = useAuthStore((state) => state.setLoading)
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  useEffect(() => {
    hydrateFromStorage()

    const handleExternalLogout = (): void => {
      clearAuth()
    }

    window.addEventListener('auth:logout', handleExternalLogout)

    // Cross-tab: another tab triggered logout (or logout-all) → mirror it
    // here so the user does not stay "logged in" with a dead token in
    // sibling tabs.
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('ils-auth')
        channel.onmessage = (event) => {
          if (event?.data?.type === 'logout') {
            clearAuth()
            const locale = window.location.pathname.startsWith('/en/') ? 'en' : 'vi'
            window.location.assign(`/${locale}/login`)
          }
        }
      } catch {
        channel = null
      }
    }

    return () => {
      window.removeEventListener('auth:logout', handleExternalLogout)
      if (channel) {
        channel.close()
      }
    }
  }, [hydrateFromStorage, clearAuth])

  const login = useCallback(
    async (payload: LoginPayload): Promise<AuthActionResult> => {
      try {
        setLoading(true)
        const response = await loginService(payload)
        setUser(response.user)
        setTokens({ accessToken: response.access, refreshToken: response.refresh })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapAuthErrorToMessageKey(error, 'auth.errors.loginFailed'),
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setTokens, setUser]
  )

  const register = useCallback(
    async (payload: RegisterPayload): Promise<AuthActionResult> => {
      try {
        setLoading(true)
        const response = await registerService(payload)
        setUser(response.user)
        setTokens({ accessToken: response.access, refreshToken: response.refresh })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapAuthErrorToMessageKey(error, 'auth.errors.registerFailed'),
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setTokens, setUser]
  )

  const logout = useCallback(async (): Promise<void> => {
    // Clear store + localStorage synchronously first so any guard (e.g.
    // GuestOnlyGate) that re-renders after navigation sees an unauth state.
    // The server-side revoke is best-effort; even if it fails we still want
    // the client to be logged out.
    const tokenToRevoke = refreshToken
    clearAuth()
    if (tokenToRevoke) {
      try {
        await logoutService({ refresh: tokenToRevoke })
      } catch {
        /* ignore — local state is already cleared */
      }
    }
  }, [clearAuth, refreshToken])

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  }
}
