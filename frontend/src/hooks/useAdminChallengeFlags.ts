'use client'

import { useCallback, useState } from 'react'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  createChallengeFlag,
  deleteChallengeFlag,
  getChallengeFlags,
  updateChallengeFlag,
} from '@/services/challenges.service'
import type { ChallengeFlag, ChallengeFlagMutationPayload } from '@/types/challenge.types'

type FlagsState = {
  data: readonly ChallengeFlag[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_FLAGS_STATE: FlagsState = { data: [], isLoading: false, errorMessageKey: null }

export const useAdminChallengeFlags = () => {
  const [flagsState, setFlagsState] = useState<FlagsState>(EMPTY_FLAGS_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadFlags = useCallback(async (slug: string) => {
    setFlagsState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const flags = await getChallengeFlags(slug)
      setFlagsState({ data: flags, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setFlagsState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapChallengeAdminErrorToMessageKey(error, 'adminChallenges.errors.loadFlagsFailed'),
      }))
    }
  }, [])

  const runMutation = useCallback(async (slug: string, fn: () => Promise<void>, fallbackKey: string): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await fn()
      await loadFlags(slug)
      return true
    } catch (error) {
      setMutationErrorKey(mapChallengeAdminErrorToMessageKey(error, fallbackKey))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadFlags])

  const submitCreateFlag = useCallback(async (slug: string, payload: ChallengeFlagMutationPayload): Promise<boolean> => {
    return runMutation(slug, async () => { await createChallengeFlag(slug, payload) }, 'adminChallenges.errors.createFlagFailed')
  }, [runMutation])

  const submitUpdateFlag = useCallback(async (slug: string, flagId: number, payload: ChallengeFlagMutationPayload): Promise<boolean> => {
    return runMutation(slug, async () => { await updateChallengeFlag(slug, flagId, payload) }, 'adminChallenges.errors.updateFlagFailed')
  }, [runMutation])

  const submitDeleteFlag = useCallback(async (slug: string, flagId: number): Promise<boolean> => {
    return runMutation(slug, async () => { await deleteChallengeFlag(slug, flagId) }, 'adminChallenges.errors.deleteFlagFailed')
  }, [runMutation])

  return {
    flagsState,
    isMutating,
    mutationErrorKey,
    loadFlags,
    submitCreateFlag,
    submitUpdateFlag,
    submitDeleteFlag,
  }
}
