'use client'

import { useCallback } from 'react'
import {
  listChallenges,
  getChallengeBySlug,
  getChallengeProgress,
  submitFlag as submitFlagApi,
  startInstance as startInstanceApi,
  stopInstance as stopInstanceApi,
  extendInstance as extendInstanceApi,
  getInstanceStatus as getInstanceStatusApi,
} from '@/services/challenges.service'
import { useChallengesStore } from '@/stores/challenges.store'
import type { ApiError } from '@/types/api'

/** Pull a human-readable message out of a normalized ApiError, else fallback. */
const errorDetail = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const detail = (error as ApiError).detail
    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }
  }
  return fallback
}

export function useChallenges() {
  const challenges = useChallengesStore((s) => s.challenges)
  const selectedChallenge = useChallengesStore((s) => s.selectedChallenge)
  const challengeProgress = useChallengesStore((s) => s.challengeProgress)
  const instanceStatus = useChallengesStore((s) => s.instanceStatus)
  const submitResult = useChallengesStore((s) => s.submitResult)
  const isLoading = useChallengesStore((s) => s.isLoading)
  const isSubmitting = useChallengesStore((s) => s.isSubmitting)
  const isInstanceLoading = useChallengesStore((s) => s.isInstanceLoading)
  const error = useChallengesStore((s) => s.error)

  const setChallenges = useChallengesStore((s) => s.setChallenges)
  const setSelectedChallenge = useChallengesStore((s) => s.setSelectedChallenge)
  const setChallengeProgress = useChallengesStore((s) => s.setChallengeProgress)
  const setInstanceStatus = useChallengesStore((s) => s.setInstanceStatus)
  const setSubmitResult = useChallengesStore((s) => s.setSubmitResult)
  const setLoading = useChallengesStore((s) => s.setLoading)
  const setSubmitting = useChallengesStore((s) => s.setSubmitting)
  const setInstanceLoading = useChallengesStore((s) => s.setInstanceLoading)
  const setError = useChallengesStore((s) => s.setError)

  const loadChallenges = useCallback(
    async (params?: Parameters<typeof listChallenges>[0]) => {
      setLoading(true)
      setError(null)
      try {
        const data = await listChallenges(params)
        setChallenges([...data.results])
      } catch {
        setError('Failed to load challenges')
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setChallenges]
  )

  const loadChallengeDetail = useCallback(
    async (slug: string) => {
      setLoading(true)
      setError(null)
      try {
        const data = await getChallengeBySlug(slug)
        setSelectedChallenge(data)
      } catch {
        setError('Failed to load challenge')
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setSelectedChallenge]
  )

  const loadChallengeProgress = useCallback(
    async (slug: string) => {
      try {
        const data = await getChallengeProgress(slug)
        setChallengeProgress(data)
      } catch {
        setChallengeProgress(null)
      }
    },
    [setChallengeProgress]
  )

  const loadInstanceStatus = useCallback(
    async (slug: string) => {
      try {
        const data = await getInstanceStatusApi(slug)
        setInstanceStatus(data)
      } catch {
        setInstanceStatus(null)
      }
    },
    [setInstanceStatus]
  )

  const submitFlag = useCallback(
    async (slug: string, flag: string) => {
      setSubmitting(true)
      setSubmitResult(null)
      try {
        const result = await submitFlagApi(slug, { flag })
        setSubmitResult(result)
        if (result.correct) {
          const progress = await getChallengeProgress(slug)
          setChallengeProgress(progress)
        }
        return result
      } catch {
        setError('Failed to submit flag')
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [setSubmitting, setSubmitResult, setError, setChallengeProgress]
  )

  const startInstance = useCallback(
    async (slug: string) => {
      setInstanceLoading(true)
      setError(null)
      try {
        const instance = await startInstanceApi(slug)
        setInstanceStatus(instance)
        return instance
      } catch (error) {
        setError(errorDetail(error, 'Failed to start instance'))
        return null
      } finally {
        setInstanceLoading(false)
      }
    },
    [setInstanceLoading, setInstanceStatus, setError]
  )

  const stopInstance = useCallback(
    async (slug: string) => {
      setInstanceLoading(true)
      setError(null)
      try {
        await stopInstanceApi(slug)
        const status = await getInstanceStatusApi(slug)
        setInstanceStatus(status)
      } catch {
        setError('Failed to stop instance')
      } finally {
        setInstanceLoading(false)
      }
    },
    [setInstanceLoading, setInstanceStatus, setError]
  )

  const extendInstance = useCallback(
    async (slug: string) => {
      setInstanceLoading(true)
      setError(null)
      try {
        const instance = await extendInstanceApi(slug)
        setInstanceStatus(instance)
        return instance
      } catch (error) {
        setError(errorDetail(error, 'Failed to extend instance'))
        return null
      } finally {
        setInstanceLoading(false)
      }
    },
    [setInstanceLoading, setInstanceStatus, setError]
  )

  return {
    challenges,
    selectedChallenge,
    challengeProgress,
    instanceStatus,
    submitResult,
    isLoading,
    isSubmitting,
    isInstanceLoading,
    error,
    loadChallenges,
    loadChallengeDetail,
    loadChallengeProgress,
    loadInstanceStatus,
    submitFlag,
    startInstance,
    stopInstance,
    extendInstance,
  }
}
