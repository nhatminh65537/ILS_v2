type JwtPayload = {
  admin_surface?: boolean
  admin_sections?: readonly string[]
}

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + padLength, '=')
  return atob(padded)
}

const decodeJwtPayload = (accessToken: string | null | undefined): JwtPayload | null => {
  if (!accessToken) {
    return null
  }

  const chunks = accessToken.split('.')
  if (chunks.length < 2) {
    return null
  }

  try {
    const payloadString = decodeBase64Url(chunks[1])
    return JSON.parse(payloadString) as JwtPayload
  } catch {
    return null
  }
}

export const hasAdminSurfaceAccess = (accessToken: string | null | undefined): boolean => {
  const payload = decodeJwtPayload(accessToken)
  return payload?.admin_surface === true
}

export const getAdminSections = (accessToken: string | null | undefined): ReadonlySet<string> => {
  const payload = decodeJwtPayload(accessToken)
  const raw = payload?.admin_sections
  if (!Array.isArray(raw)) {
    return new Set<string>()
  }
  return new Set(raw.filter((item): item is string => typeof item === 'string'))
}

export const hasAdminSection = (
  accessToken: string | null | undefined,
  section: string
): boolean => {
  return getAdminSections(accessToken).has(section)
}
