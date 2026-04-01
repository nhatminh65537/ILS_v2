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
    return () => {
      window.removeEventListener('auth:logout', handleExternalLogout)
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
    try {
      if (refreshToken) {
        await logoutService({ refresh: refreshToken })
      }
    } finally {
      clearAuth()
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
