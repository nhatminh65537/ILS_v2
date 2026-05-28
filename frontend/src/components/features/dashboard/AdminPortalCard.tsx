'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { hasAdminSurfaceAccess } from '@/lib/rbac-claim'
import { useAuthStore } from '@/stores/auth.store'

type AdminPortalCardProps = {
  locale: string
}

const ACCESS_TOKEN_KEY = 'access_token'

const subscribeToStorage = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

const readAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

const readAccessTokenServer = (): string | null => null

// Renders the "Admin" entry card on the user dashboard only when the current
// access token carries the admin_surface claim. Without this gate every
// member sees a link they cannot use (they bounce off AdminLoginForm's
// permission check).
export function AdminPortalCard({ locale }: AdminPortalCardProps) {
  const tAdmin = useTranslations('admin')
  const storedToken = useSyncExternalStore(subscribeToStorage, readAccessToken, readAccessTokenServer)
  const inMemoryToken = useAuthStore((state) => state.accessToken)
  const accessToken = inMemoryToken ?? storedToken

  if (!hasAdminSurfaceAccess(accessToken)) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tAdmin('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground">{tAdmin('portalDescription')}</p>
        <Link className="block text-xs underline" href={`/${locale}/admin/login`}>
          {tAdmin('portalEntry')}
        </Link>
      </CardContent>
    </Card>
  )
}
