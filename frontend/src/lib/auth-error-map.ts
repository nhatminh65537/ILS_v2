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

export const mapAuthErrorToMessageKey = (
  error: unknown,
  fallbackKey: string
): string => {
  const text = extractErrorText(error)

  if (containsText(text, 'no active account') || containsText(text, 'invalid')) {
    return 'auth.errors.invalidCredentials'
  }

  if (containsText(text, 'too many') || containsText(text, 'rate limit') || containsText(text, '429')) {
    return 'auth.errors.rateLimited'
  }

  if (containsText(text, 'registration') && containsText(text, 'disabled')) {
    return 'auth.errors.registrationDisabled'
  }

  if (containsText(text, 'local') && containsText(text, 'disabled')) {
    return 'auth.errors.localLoginDisabled'
  }

  return fallbackKey
}
