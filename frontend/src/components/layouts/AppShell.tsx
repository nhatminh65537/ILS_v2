import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { SessionNavControls } from './SessionNavControls'
import { Sidebar } from './Sidebar'
import type { ShellNavItem } from './types'

type AppShellProps = {
  locale: string
  brandHref: string
  brandLabel: string
  surfaceLabel: string
  topLinks: readonly ShellNavItem[]
  sidebarTitle: string
  sidebarLinks: readonly ShellNavItem[]
  footerText: string
  showSidebar?: boolean
  children: ReactNode
}

export function AppShell({
  locale,
  brandHref,
  brandLabel,
  surfaceLabel,
  topLinks,
  sidebarTitle,
  sidebarLinks,
  footerText,
  showSidebar = true,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar
        brandHref={brandHref}
        brandLabel={brandLabel}
        links={topLinks}
        surfaceLabel={surfaceLabel}
        trailing={<SessionNavControls locale={locale} />}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 md:px-6 lg:gap-6">
        {showSidebar ? (
          <div className="hidden w-64 shrink-0 md:block">
            <Sidebar items={sidebarLinks} title={sidebarTitle} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <Footer text={footerText} />
    </div>
  )
}
