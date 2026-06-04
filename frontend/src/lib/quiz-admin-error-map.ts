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

/**
 * Returns a translation key relative to the `adminQuizzes` namespace.
 * Consumers translate it with a translator scoped to `adminQuizzes`
 * (e.g. `useTranslations('adminQuizzes')`), so keys must NOT be prefixed
 * with `adminQuizzes.` or they resolve to a double namespace.
 * The `fallbackKey` passed in must likewise be relative (e.g. `errors.createFailed`).
 */
export const mapQuizAdminErrorToMessageKey = (error: unknown, fallbackKey: string): string => {
  const text = extractErrorText(error)

  if (containsText(text, 'not authenticated') || containsText(text, 'authentication credentials')) {
    return 'errors.unauthenticated'
  }

  if (containsText(text, 'permission denied') || containsText(text, 'forbidden')) {
    return 'errors.forbidden'
  }

  if (containsText(text, 'not found')) {
    return 'errors.notFound'
  }

  if (containsText(text, 'cycle')) {
    return 'errors.moveNodeFailed'
  }

  if (containsText(text, 'required') || containsText(text, 'invalid')) {
    return 'errors.validation'
  }

  return fallbackKey
}
