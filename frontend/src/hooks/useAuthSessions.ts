'use client'

import { useCallback, useMemo, useState } from 'react'
import { getCurrentSessionId, getOtherSessionIds, sortAuthSessions } from '@/lib/auth-sessions'
import { listSessions, revokeSession } from '@/services/auth.service'
import type { AuthSessionListItem } from '@/types/user.types'

interface AuthSessionsListState {
  data: AuthSessionListItem[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_LIST_STATE: AuthSessionsListState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

export const useAuthSessions = () => {
  const [sessionsState, setSessionsState] = useState<AuthSessionsListState>(EMPTY_LIST_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)
  const [mutationSuccessKey, setMutationSuccessKey] = useState<string | null>(null)

  const currentSessionId = useMemo(
    () => getCurrentSessionId(sessionsState.data),
    [sessionsState.data]
  )

  const loadSessions = useCallback(async () => {
    setSessionsState((state) => ({ ...state, isLoading: true, errorMessageKey: null }))
    try {
      const sessions = await listSessions()
      setSessionsState({
        data: sortAuthSessions(sessions),
        isLoading: false,
        errorMessageKey: null,
      })
    } catch {
      setSessionsState((state) => ({
        ...state,
        isLoading: false,
        errorMessageKey: 'sessions.errors.loadFailed',
      }))
    }
  }, [])

  const revokeSessionById = useCallback(
    async (sessionId: number): Promise<{ ok: boolean; reason?: string }> => {
      if (sessionId === currentSessionId) {
        setMutationErrorKey('sessions.errors.currentSessionProtected')
        setMutationSuccessKey(null)
        return { ok: false, reason: 'currentSessionProtected' }
      }

      setIsMutating(true)
      setMutationErrorKey(null)
      setMutationSuccessKey(null)

      try {
        await revokeSession(sessionId)
        await loadSessions()
        setMutationSuccessKey('sessions.success.revokeOne')
        return { ok: true }
      } catch {
        setMutationErrorKey('sessions.errors.revokeFailed')
        return { ok: false, reason: 'revokeFailed' }
      } finally {
        setIsMutating(false)
      }
    },
    [currentSessionId, loadSessions]
  )

  const revokeAllOtherSessions = useCallback(async (): Promise<{ ok: boolean }> => {
    const otherIds = getOtherSessionIds(sessionsState.data)
    if (otherIds.length === 0) {
      return { ok: true }
    }

    setIsMutating(true)
    setMutationErrorKey(null)
    setMutationSuccessKey(null)

    try {
      const results = await Promise.allSettled(otherIds.map((sessionId) => revokeSession(sessionId)))
      await loadSessions()

      const hasFailure = results.some((result) => result.status === 'rejected')
      if (hasFailure) {
        setMutationErrorKey('sessions.errors.revokeAllFailed')
        return { ok: false }
      }

      setMutationSuccessKey('sessions.success.revokeAll')
      return { ok: true }
    } catch {
      setMutationErrorKey('sessions.errors.revokeAllFailed')
      return { ok: false }
    } finally {
      setIsMutating(false)
    }
  }, [loadSessions, sessionsState.data])

  return {
    sessionsState,
    currentSessionId,
    isMutating,
    mutationErrorKey,
    mutationSuccessKey,
    loadSessions,
    revokeSessionById,
    revokeAllOtherSessions,
  }
}
