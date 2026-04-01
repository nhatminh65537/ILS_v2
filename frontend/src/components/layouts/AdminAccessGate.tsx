'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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

const safeGetPersistApi = () => (useAuthStore as any).persist ?? {}

const useAuthGuardState = (): { isReady: boolean; isAuthenticated: boolean } => {
  const [isReady, setIsReady] = useState(() => safeGetPersistApi().hasHydrated?.() ?? true)
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (safeGetPersistApi().hasHydrated?.()) {
      return
    }

    const unsubscribe = safeGetPersistApi().onFinishHydration?.(() => {
      setIsReady(true)
    }) ?? (() => undefined)

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

export function AdminAccessGate({ locale, loadingLabel, children }: AdminAccessGateProps) {
  const router = useRouter()
  const { isReady, isAuthenticated } = useAuthGuardState()

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/${locale}/admin/login`)
    }
  }, [isAuthenticated, isReady, locale, router])

  if (!isReady || !isAuthenticated) {
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
