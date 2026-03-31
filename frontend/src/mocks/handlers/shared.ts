import { HttpResponse } from 'msw'
import type { PaginatedResponse } from '@/types/api'

export const notFound = (detail = 'Not found') => HttpResponse.json({ detail }, { status: 404 })

export const badRequest = (detail: string) => HttpResponse.json({ detail }, { status: 400 })

export const parseNumericId = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const toPaginatedResponse = <T>(
  items: readonly T[],
  options: { limit?: number; offset?: number; basePath: string }
): PaginatedResponse<T> => {
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 10
  const offset = Number.isFinite(options.offset) ? Number(options.offset) : 0
  const safeLimit = limit > 0 ? limit : 10
  const safeOffset = offset >= 0 ? offset : 0

  const paged = items.slice(safeOffset, safeOffset + safeLimit)
  const nextOffset = safeOffset + safeLimit
  const previousOffset = safeOffset - safeLimit

  return {
    count: items.length,
    next: nextOffset < items.length ? `${options.basePath}?limit=${safeLimit}&offset=${nextOffset}` : null,
    previous: previousOffset >= 0 ? `${options.basePath}?limit=${safeLimit}&offset=${previousOffset}` : null,
    results: paged,
  }
}
