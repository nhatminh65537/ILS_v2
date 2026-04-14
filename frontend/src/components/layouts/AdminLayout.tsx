import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

type AdminLayoutProps = {
  locale: string
  brandLabel: string
  surfaceLabel: string
  sidebarTitle: string
  adminHomeLabel: string
  dashboardLabel: string
  rbacLabel: string
  configLabel: string
  usersLabel: string
  quizzesLabel: string
  coursesLabel: string
  challengesLabel: string
  notificationsLabel: string
  statisticsLabel: string
  userPortalLabel: string
  footerText: string
  children: ReactNode
}

export function AdminLayout({
  locale,
  brandLabel,
  surfaceLabel,
  sidebarTitle,
  adminHomeLabel,
  dashboardLabel,
  rbacLabel,
  configLabel,
  usersLabel,
  quizzesLabel,
  coursesLabel,
  challengesLabel,
  notificationsLabel,
  statisticsLabel,
  userPortalLabel,
  footerText,
  children,
}: AdminLayoutProps) {
  const adminHomeHref = `/${locale}/admin`
  const dashboardHref = `/${locale}/admin/dashboard`
  const rbacHref = `/${locale}/admin/rbac`
  const configHref = `/${locale}/admin/config`
  const usersHref = `/${locale}/admin/users`
  const quizzesHref = `/${locale}/admin/quizzes`
  const coursesHref = `/${locale}/admin/learn/courses`
  const challengesHref = `/${locale}/admin/challenges`
  const notificationsHref = `/${locale}/admin/notifications`
  const statisticsHref = `/${locale}/admin/statistics`
  const userDashboardHref = `/${locale}/dashboard`

  return (
    <AppShell
      locale={locale}
      brandHref={adminHomeHref}
      brandLabel={brandLabel}
      footerText={footerText}
      sidebarLinks={[
        { href: dashboardHref, label: dashboardLabel },
        { href: usersHref, label: usersLabel },
        { href: rbacHref, label: rbacLabel },
        { href: configHref, label: configLabel },
        { href: quizzesHref, label: quizzesLabel },
        { href: coursesHref, label: coursesLabel },
        { href: challengesHref, label: challengesLabel },
        { href: notificationsHref, label: notificationsLabel },
        { href: statisticsHref, label: statisticsLabel },
      ]}
      sidebarTitle={sidebarTitle}
      surfaceLabel={surfaceLabel}
      topLinks={[
        { href: adminHomeHref, label: adminHomeLabel },
        { href: dashboardHref, label: dashboardLabel },
        { href: rbacHref, label: rbacLabel },
        { href: configHref, label: configLabel },
        { href: usersHref, label: usersLabel },
        { href: quizzesHref, label: quizzesLabel },
        { href: userDashboardHref, label: userPortalLabel },
      ]}
    >
      {children}
    </AppShell>
  )
}
