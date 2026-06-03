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

export const mapLearnAdminErrorToMessageKey = (error: unknown, fallbackKey: string): string => {
  const text = extractErrorText(error)

  if (containsText(text, 'not authenticated') || containsText(text, 'authentication credentials')) {
    return 'errors.unauthenticated'
  }

  if (containsText(text, 'permission denied') || containsText(text, 'forbidden')) {
    return 'errors.forbidden'
  }

  // Slug conflict must be checked before the generic validation rule below,
  // otherwise a message containing "invalid"/"required" could shadow it.
  if (containsText(text, 'slug already exists')) {
    return 'errors.slugConflict'
  }

  if (containsText(text, 'not found')) {
    return 'errors.notFound'
  }

  if (containsText(text, 'required') || containsText(text, 'invalid')) {
    return 'errors.validation'
  }

  return fallbackKey
}
