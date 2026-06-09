import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

type UserLayoutProps = {
  locale: string
  brandLabel: string
  surfaceLabel: string
  sidebarTitle: string
  homeLabel: string
  dashboardLabel: string
  coursesLabel: string
  challengesLabel: string
  quizzesLabel: string
  leaderboardLabel: string
  profileLabel: string
  adminPortalLabel: string
  footerText: string
  showSidebar?: boolean
  children: ReactNode
}

export function UserLayout({
  locale,
  brandLabel,
  surfaceLabel,
  sidebarTitle,
  homeLabel,
  dashboardLabel,
  coursesLabel,
  challengesLabel,
  quizzesLabel,
  leaderboardLabel,
  profileLabel,
  adminPortalLabel,
  footerText,
  showSidebar = true,
  children,
}: UserLayoutProps) {
  const homeHref = `/${locale}`
  const dashboardHref = `/${locale}/dashboard`
  const coursesHref = `/${locale}/courses`
  const challengesHref = `/${locale}/challenges`
  const quizzesHref = `/${locale}/quizzes`
  const leaderboardHref = `/${locale}/leaderboard`
  const profileHref = `/${locale}/profile/settings`
  const adminLoginHref = `/${locale}/admin/login`

  return (
    <AppShell
      locale={locale}
      brandHref={homeHref}
      brandLabel={brandLabel}
      footerText={footerText}
      showSidebar={showSidebar}
      sidebarLinks={[
        { href: dashboardHref, label: dashboardLabel },
        { href: coursesHref, label: coursesLabel },
        { href: challengesHref, label: challengesLabel },
        { href: quizzesHref, label: quizzesLabel },
        { href: leaderboardHref, label: leaderboardLabel },
        { href: profileHref, label: profileLabel },
        { href: homeHref, label: homeLabel },
        { href: adminLoginHref, label: adminPortalLabel },
      ]}
      sidebarTitle={sidebarTitle}
      surfaceLabel={surfaceLabel}
      topLinks={[
        { href: homeHref, label: homeLabel },
        { href: dashboardHref, label: dashboardLabel },
        { href: coursesHref, label: coursesLabel },
        { href: challengesHref, label: challengesLabel },
        { href: quizzesHref, label: quizzesLabel },
        { href: leaderboardHref, label: leaderboardLabel },
      ]}
    >
      {children}
    </AppShell>
  )
}
