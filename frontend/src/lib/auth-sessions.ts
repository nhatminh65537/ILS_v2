import type { AuthSessionListItem } from '@/types/user.types'

const toTimestamp = (value?: string): number => {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const sortAuthSessions = (
  sessions: readonly AuthSessionListItem[]
): AuthSessionListItem[] => {
  return [...sessions].sort((a, b) => {
    const delta = toTimestamp(b.last_used_at) - toTimestamp(a.last_used_at)
    if (delta !== 0) {
      return delta
    }
    return b.id - a.id
  })
}

export const getCurrentSessionId = (
  sessions: readonly AuthSessionListItem[]
): number | null => {
  const sorted = sortAuthSessions(sessions)
  return sorted.length > 0 ? sorted[0].id : null
}

export const getOtherSessionIds = (
  sessions: readonly AuthSessionListItem[]
): number[] => {
  const sorted = sortAuthSessions(sessions)
  return sorted.slice(1).map((session) => session.id)
}
