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

const extractFieldKey = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }
  const apiError = error as Record<string, unknown>
  if ('username' in apiError && apiError.username) return 'username'
  if ('email' in apiError && apiError.email) return 'email'
  return null
}

export const mapAuthErrorToMessageKey = (
  error: unknown,
  fallbackKey: string
): string => {
  const text = extractErrorText(error)
  const field = extractFieldKey(error)

  // Field-level duplicate-value errors come back as {username|email: [...]}
  // — translate them to specific i18n keys instead of falling through to
  // the generic "registerFailed" / "loginFailed".
  if (containsText(text, 'already exists') || containsText(text, 'duplicate')) {
    if (field === 'email') return 'auth.errors.emailTaken'
    if (field === 'username') return 'auth.errors.usernameTaken'
    return 'auth.errors.usernameTaken'
  }

  if (containsText(text, 'current password') && containsText(text, 'incorrect')) {
    return 'auth.errors.currentPasswordIncorrect'
  }

  if (containsText(text, 'reset link') || containsText(text, 'invalid or has expired')) {
    return 'auth.errors.resetTokenInvalid'
  }

  if (containsText(text, 'password reset') && containsText(text, 'disabled')) {
    return 'auth.errors.resetDisabled'
  }

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
