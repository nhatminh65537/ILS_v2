import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

type AdminLayoutProps = {
  locale: string
  brandLabel: string
  surfaceLabel: string
  sidebarTitle: string
  adminHomeLabel: string
  rbacLabel: string
  configLabel: string
  usersLabel: string
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
  rbacLabel,
  configLabel,
  usersLabel,
  userPortalLabel,
  footerText,
  children,
}: AdminLayoutProps) {
  const adminHomeHref = `/${locale}/admin`
  const rbacHref = `/${locale}/admin/rbac`
  const configHref = `/${locale}/admin/config`
  const usersHref = `/${locale}/admin/users`
  const userDashboardHref = `/${locale}/dashboard`

  return (
    <AppShell
      locale={locale}
      brandHref={adminHomeHref}
      brandLabel={brandLabel}
      footerText={footerText}
      sidebarLinks={[
        { href: rbacHref, label: rbacLabel },
        { href: configHref, label: configLabel },
        { href: usersHref, label: usersLabel },
      ]}
      sidebarTitle={sidebarTitle}
      surfaceLabel={surfaceLabel}
      topLinks={[
        { href: adminHomeHref, label: adminHomeLabel },
        { href: rbacHref, label: rbacLabel },
        { href: configHref, label: configLabel },
        { href: usersHref, label: usersLabel },
        { href: userDashboardHref, label: userPortalLabel },
      ]}
    >
      {children}
    </AppShell>
  )
}
