'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { hasPermissionKey } from '@/lib/rbac-claim'
import { listPermissions } from '@/services/rbac.service'
import { useAuthStore } from '@/stores/auth.store'

type AdminAccessGateProps = {
  locale: string
  loadingLabel: string
  children: ReactNode
}

type UserAccessGateProps = {
  locale: string
  loadingLabel: string
  children: ReactNode
}

type GuestOnlyGateProps = {
  redirectTo: string
  loadingLabel: string
  children: ReactNode
}

const useAuthGuardState = (): { isReady: boolean; isAuthenticated: boolean } => {
  const [isReady, setIsReady] = useState(() => useAuthStore.persist.hasHydrated())
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      return
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsReady(true)
    })

    hydrateFromStorage()

    return () => {
      unsubscribe()
    }
  }, [hydrateFromStorage])

  return {
    isReady,
    isAuthenticated: useMemo(() => Boolean(isAuthenticated || accessToken), [accessToken, isAuthenticated]),
  }
}

const canEnterAdminSurface = async (accessToken: string | null): Promise<boolean> => {
  if (!accessToken) {
    return false
  }

  try {
    const permissionsCatalog = await listPermissions(true)

    return (
      hasPermissionKey(accessToken, permissionsCatalog, 'api.role.list') ||
      hasPermissionKey(accessToken, permissionsCatalog, 'api.system_config.list')
    )
  } catch {
    return false
  }
}

export function AdminAccessGate({ locale, loadingLabel, children }: AdminAccessGateProps) {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const { isReady, isAuthenticated } = useAuthGuardState()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/${locale}/admin/login`)
    }
  }, [isAuthenticated, isReady, locale, router])

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return
    }

    let active = true

    Promise.resolve().then(() => {
      if (!active) {
        return
      }

      setIsCheckingAccess(true)
      setHasAdminAccess(false)
    })

    void canEnterAdminSurface(accessToken).then((allowed) => {
      if (!active) {
        return
      }

      setHasAdminAccess(allowed)
      setIsCheckingAccess(false)

      if (!allowed) {
        router.replace(`/${locale}/dashboard`)
      }
    })

    return () => {
      active = false
    }
  }, [accessToken, isAuthenticated, isReady, locale, router])

  if (!isReady || !isAuthenticated || isCheckingAccess || !hasAdminAccess) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }

  return <>{children}</>
}

export function UserAccessGate({ locale, loadingLabel, children }: UserAccessGateProps) {
  const router = useRouter()
  const { isReady, isAuthenticated } = useAuthGuardState()

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/${locale}/login`)
    }
  }, [isAuthenticated, isReady, locale, router])

  if (!isReady || !isAuthenticated) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }

  return <>{children}</>
}

export function GuestOnlyGate({ redirectTo, loadingLabel, children }: GuestOnlyGateProps) {
  const router = useRouter()
  const { isReady, isAuthenticated } = useAuthGuardState()

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [isAuthenticated, isReady, redirectTo, router])

  if (!isReady) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }

  if (isAuthenticated) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }

  return <>{children}</>
}
