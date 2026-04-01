import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { SessionNavControls } from './SessionNavControls'

type AuthLayoutProps = {
  locale: string
  brandLabel: string
  brandHref: string
  surfaceLabel: string
  homeLabel: string
  footerText: string
  children: ReactNode
}

export function AuthLayout({
  locale,
  brandLabel,
  brandHref,
  surfaceLabel,
  homeLabel,
  footerText,
  children,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar
        brandHref={brandHref}
        brandLabel={brandLabel}
        links={[{ href: brandHref, label: homeLabel }]}
        surfaceLabel={surfaceLabel}
        trailing={<SessionNavControls locale={locale} />}
      />

      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-10">{children}</div>

      <Footer text={footerText} />
    </div>
  )
}
