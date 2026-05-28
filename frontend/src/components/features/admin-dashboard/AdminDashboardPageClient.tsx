'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { AdminOverviewCards } from '@/components/features/admin-stats/AdminOverviewCards'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { getAdminSections } from '@/lib/rbac-claim'
import { useAuthStore } from '@/stores/auth.store'

type AdminDashboardPageClientProps = {
  locale: string
}

type QuickLink = {
  labelKey: string
  href: string
  section: string
}

export function AdminDashboardPageClient({ locale }: AdminDashboardPageClientProps) {
  const t = useTranslations('adminDashboard')
  const { state, loadDashboard } = useAdminDashboard()
  const accessToken = useAuthStore((s) => s.accessToken)
  const sections = useMemo(() => getAdminSections(accessToken), [accessToken])

  const canSeeStatistics = sections.has('statistics')

  useEffect(() => {
    if (canSeeStatistics) {
      void loadDashboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeStatistics])

  const quickLinks: readonly QuickLink[] = [
    { labelKey: 'quickLinks.learn', href: `/${locale}/admin/learn/courses`, section: 'learn' },
    { labelKey: 'quickLinks.challenges', href: `/${locale}/admin/challenges`, section: 'challenges' },
    { labelKey: 'quickLinks.quizzes', href: `/${locale}/admin/quizzes`, section: 'quizzes' },
    { labelKey: 'quickLinks.users', href: `/${locale}/admin/users`, section: 'users' },
    { labelKey: 'quickLinks.notifications', href: `/${locale}/admin/notifications`, section: 'notifications' },
    { labelKey: 'quickLinks.config', href: `/${locale}/admin/config`, section: 'config' },
  ]

  const visibleLinks = quickLinks.filter((link) => sections.has(link.section))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Overview cards — gated by statistics section */}
      {canSeeStatistics ? (
        <>
          {state.errorMessageKey && (
            <p className="text-destructive text-sm">
              {t(state.errorMessageKey as Parameters<typeof t>[0])}
            </p>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t('overview.title')}</h2>
            <AdminOverviewCards data={state.data} isLoading={state.isLoading} />
          </section>
        </>
      ) : null}

      {/* Quick links — filtered by sections claim */}
      {visibleLinks.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t('quickLinks.title')}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {visibleLinks.map(({ labelKey, href }) => (
              <Link key={labelKey} href={href}>
                <Card className="hover:bg-accent cursor-pointer transition-colors">
                  <CardContent className="flex items-center justify-center py-6">
                    <span className="font-medium">
                      {t(labelKey as Parameters<typeof t>[0])}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
