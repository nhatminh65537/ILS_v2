import type { ApiError } from '@/types/api'

const containsText = (value: string | undefined, needle: string): boolean =>
  Boolean(value && value.toLowerCase().includes(needle.toLowerCase()))

const extractErrorText = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const apiError = error as ApiError

  if (typeof apiError.detail === 'string') {
    return apiError.detail
  }

  const entries = Object.entries(apiError)
  const firstEntry = entries.find(([key]) => key !== 'detail')
  if (!firstEntry) {
    return ''
  }

  const value = firstEntry[1]
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return ''
}

export const mapChallengeAdminErrorToMessageKey = (error: unknown, fallbackKey: string): string => {
  const text = extractErrorText(error)

  if (containsText(text, 'not authenticated') || containsText(text, 'authentication credentials')) {
    return 'adminChallenges.errors.unauthenticated'
  }

  if (containsText(text, 'permission denied') || containsText(text, 'forbidden')) {
    return 'adminChallenges.errors.forbidden'
  }

  if (containsText(text, 'not found')) {
    return 'adminChallenges.errors.notFound'
  }

  if (containsText(text, 'required') || containsText(text, 'invalid')) {
    return 'adminChallenges.errors.validation'
  }

  if (containsText(text, 'slug already exists') || containsText(text, 'unique')) {
    return 'adminChallenges.errors.slugConflict'
  }

  return fallbackKey
}
