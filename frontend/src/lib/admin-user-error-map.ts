import type { ApiError } from '@/types/api'

/**
 * Extracts a human-readable message from a DRF error for admin user mutations.
 *
 * The create/update serializer applies Django's AUTH_PASSWORD_VALIDATORS to the
 * (optional) password and enforces unique username/email, so a 400 most often
 * carries a field-level reason ("This password is too common.", "A user with
 * that username already exists.", …). We surface that exact text instead of a
 * generic banner so the admin knows *why* the create failed.
 *
 * Returns the first useful message, or null to let the caller fall back to a
 * generic translated key.
 */
export const extractAdminUserErrorText = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const apiError = error as ApiError

  if (typeof apiError.detail === 'string' && apiError.detail.trim()) {
    return apiError.detail
  }

  // Prefer the known fields in a sensible order, then any remaining field.
  const orderedKeys = ['password', 'username', 'email', 'role_ids', 'non_field_errors']
  const keys = [
    ...orderedKeys.filter((key) => key in apiError),
    ...Object.keys(apiError).filter((key) => key !== 'detail' && !orderedKeys.includes(key)),
  ]

  for (const key of keys) {
    const value = apiError[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      return value[0]
    }
  }

  return null
}
