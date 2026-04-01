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
  userPortalLabel,
  footerText,
  children,
}: AdminLayoutProps) {
  const adminHomeHref = `/${locale}/admin`
  const rbacHref = `/${locale}/admin/rbac`
  const configHref = `/${locale}/admin/config`
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
      ]}
      sidebarTitle={sidebarTitle}
      surfaceLabel={surfaceLabel}
      topLinks={[
        { href: adminHomeHref, label: adminHomeLabel },
        { href: rbacHref, label: rbacLabel },
        { href: configHref, label: configLabel },
        { href: userDashboardHref, label: userPortalLabel },
      ]}
    >
      {children}
    </AppShell>
  )
}
