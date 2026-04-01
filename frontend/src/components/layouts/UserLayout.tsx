import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

type UserLayoutProps = {
  locale: string
  brandLabel: string
  surfaceLabel: string
  sidebarTitle: string
  homeLabel: string
  dashboardLabel: string
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
  adminPortalLabel,
  footerText,
  showSidebar = true,
  children,
}: UserLayoutProps) {
  const homeHref = `/${locale}`
  const dashboardHref = `/${locale}/dashboard`
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
        { href: homeHref, label: homeLabel },
        { href: adminLoginHref, label: adminPortalLabel },
      ]}
      sidebarTitle={sidebarTitle}
      surfaceLabel={surfaceLabel}
      topLinks={[
        { href: homeHref, label: homeLabel },
        { href: dashboardHref, label: dashboardLabel },
        { href: adminLoginHref, label: adminPortalLabel },
      ]}
    >
      {children}
    </AppShell>
  )
}
