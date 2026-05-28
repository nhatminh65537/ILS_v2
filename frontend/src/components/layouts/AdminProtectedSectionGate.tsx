'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAdminSections } from '@/lib/rbac-claim'
import { useAuthStore } from '@/stores/auth.store'

type SectionRule = {
  prefix: string
  section: string
}

const SECTION_RULES: readonly SectionRule[] = [
  { prefix: '/admin/dashboard', section: 'dashboard' },
  { prefix: '/admin/config', section: 'config' },
  { prefix: '/admin/rbac', section: 'rbac' },
  { prefix: '/admin/users', section: 'users' },
  { prefix: '/admin/statistics', section: 'statistics' },
  { prefix: '/admin/notifications', section: 'notifications' },
  { prefix: '/admin/learn', section: 'learn' },
  { prefix: '/admin/challenges', section: 'challenges' },
  { prefix: '/admin/quizzes', section: 'quizzes' },
]

type PersistApi = {
  hasHydrated?: () => boolean
  onFinishHydration?: (callback: () => void) => () => void
}

const getPersistApi = (): PersistApi => {
  const storeWithPersist = useAuthStore as unknown as { persist?: PersistApi }
  return storeWithPersist.persist ?? {}
}

const resolveSection = (pathname: string | null): string | null => {
  if (!pathname) {
    return null
  }
  for (const rule of SECTION_RULES) {
    const adminIndex = pathname.indexOf(rule.prefix)
    if (adminIndex >= 0) {
      return rule.section
    }
  }
  return null
}

type AdminProtectedSectionGateProps = {
  locale: string
  loadingLabel: string
  children: ReactNode
}

export function AdminProtectedSectionGate({
  locale,
  loadingLabel,
  children,
}: AdminProtectedSectionGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const persistApi = getPersistApi()
    let isActive = true

    const finalize = () => {
      if (!isActive) return
      hydrateFromStorage()
      setIsReady(true)
    }

    if (persistApi.hasHydrated?.()) {
      finalize()
      return () => {
        isActive = false
      }
    }

    hydrateFromStorage()
    const unsubscribe = persistApi.onFinishHydration?.(() => {
      finalize()
    })
    if (!persistApi.onFinishHydration) {
      finalize()
    }
    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [hydrateFromStorage])

  const section = useMemo(() => resolveSection(pathname), [pathname])
  const sections = useMemo(() => getAdminSections(accessToken), [accessToken])

  const isGated = section !== null
  const hasAccess = isGated ? sections.has(section) : true

  useEffect(() => {
    if (isReady && isGated && !hasAccess) {
      router.replace(`/${locale}/admin`)
    }
  }, [hasAccess, isGated, isReady, locale, router])

  if (!isReady) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }
  if (isGated && !hasAccess) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{loadingLabel}</div>
  }
  return <>{children}</>
}
