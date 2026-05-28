import type { ReactNode } from 'react'
import { AdminSidebar, type AdminSidebarItem } from './AdminSidebar'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { SessionNavControls } from './SessionNavControls'
import type { ShellNavItem } from './types'

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

  const sidebarItems: readonly AdminSidebarItem[] = [
    { href: dashboardHref, label: dashboardLabel, section: 'dashboard' },
    { href: usersHref, label: usersLabel, section: 'users' },
    { href: rbacHref, label: rbacLabel, section: 'rbac' },
    { href: configHref, label: configLabel, section: 'config' },
    { href: quizzesHref, label: quizzesLabel, section: 'quizzes' },
    { href: coursesHref, label: coursesLabel, section: 'learn' },
    { href: challengesHref, label: challengesLabel, section: 'challenges' },
    { href: notificationsHref, label: notificationsLabel, section: 'notifications' },
    { href: statisticsHref, label: statisticsLabel, section: 'statistics' },
  ]

  const topLinks: readonly ShellNavItem[] = [
    { href: adminHomeHref, label: adminHomeLabel },
    { href: userDashboardHref, label: userPortalLabel },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar
        brandHref={adminHomeHref}
        brandLabel={brandLabel}
        links={topLinks}
        surfaceLabel={surfaceLabel}
        trailing={<SessionNavControls locale={locale} />}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 md:px-6 lg:gap-6">
        <div className="hidden w-64 shrink-0 md:block">
          <AdminSidebar items={sidebarItems} title={sidebarTitle} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <Footer text={footerText} />
    </div>
  )
}
