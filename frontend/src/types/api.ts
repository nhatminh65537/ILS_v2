/**
 * Generic API response and error wrappers
 * Derived from Django REST Framework default response shapes
 */

/**
 * DRF Paginated List Response
 * Used for all list endpoints with pagination
 */
export type PaginatedResponse<T> = {
  readonly count: number
  readonly next: string | null
  readonly previous: string | null
  readonly results: readonly T[]
}

/**
 * Generic API Success Response
 * Optional wrapper for custom response shapes
 */
export type ApiResponse<T> = {
  readonly data: T
  readonly message: string
  readonly success: boolean
}

/**
 * API Error Response
 * DRF returns validation errors per field or generic detail
 */
export type ApiError = {
  readonly detail?: string
  readonly [field: string]: string | readonly string[] | undefined
}

/**
 * HTTP Status Response with empty body (204 No Content)
 */
export type EmptyResponse = void
