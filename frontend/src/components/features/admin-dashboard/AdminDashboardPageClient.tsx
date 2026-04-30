'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { AdminOverviewCards } from '@/components/features/admin-stats/AdminOverviewCards'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'

type AdminDashboardPageClientProps = {
  locale: string
}

export function AdminDashboardPageClient({ locale }: AdminDashboardPageClientProps) {
  const t = useTranslations('adminDashboard')
  const { state, loadDashboard } = useAdminDashboard()

  useEffect(() => {
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quickLinks: { labelKey: string; href: string }[] = [
    { labelKey: 'quickLinks.learn', href: `/${locale}/admin/courses` },
    { labelKey: 'quickLinks.challenges', href: `/${locale}/admin/challenges` },
    { labelKey: 'quickLinks.quizzes', href: `/${locale}/admin/quizzes` },
    { labelKey: 'quickLinks.users', href: `/${locale}/admin/users` },
    { labelKey: 'quickLinks.notifications', href: `/${locale}/admin/notifications` },
    { labelKey: 'quickLinks.config', href: `/${locale}/admin/config` },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Overview error */}
      {state.errorMessageKey && (
        <p className="text-destructive text-sm">
          {t(state.errorMessageKey as Parameters<typeof t>[0])}
        </p>
      )}

      {/* Overview cards */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('overview.title')}</h2>
        <AdminOverviewCards data={state.data} isLoading={state.isLoading} />
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('quickLinks.title')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {quickLinks.map(({ labelKey, href }) => (
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
    </div>
  )
}
