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

  const valueError = apiError.value
  if (typeof valueError === 'string') {
    return valueError
  }

  if (Array.isArray(valueError) && typeof valueError[0] === 'string') {
    return valueError[0]
  }

  return ''
}

export const mapSystemConfigErrorToMessageKey = (error: unknown): string => {
  const text = extractErrorText(error)

  if (containsText(text, 'not authenticated') || containsText(text, 'authentication credentials')) {
    return 'adminConfig.errors.unauthenticated'
  }

  if (containsText(text, 'permission denied') || containsText(text, 'forbidden')) {
    return 'adminConfig.errors.forbidden'
  }

  if (containsText(text, 'config is not editable')) {
    return 'adminConfig.errors.notEditable'
  }

  if (containsText(text, 'not found')) {
    return 'adminConfig.errors.notFound'
  }

  if (containsText(text, 'must be a boolean')) {
    return 'adminConfig.errors.invalidBoolean'
  }

  if (containsText(text, 'must be an integer')) {
    return 'adminConfig.errors.invalidInteger'
  }

  if (containsText(text, 'must be a string')) {
    return 'adminConfig.errors.invalidString'
  }

  if (containsText(text, 'must be a json object or array')) {
    return 'adminConfig.errors.invalidJson'
  }

  if (containsText(text, 'unsupported config value_type')) {
    return 'adminConfig.errors.invalidType'
  }

  return 'adminConfig.errors.unknown'
}
