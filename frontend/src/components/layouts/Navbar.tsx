import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { ShellNavItem } from './types'

type NavbarProps = {
  brandHref: string
  brandLabel: string
  surfaceLabel: string
  links: readonly ShellNavItem[]
  trailing?: ReactNode
}

export function Navbar({ brandHref, brandLabel, surfaceLabel, links, trailing }: NavbarProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-4 overflow-hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="truncate text-base font-semibold" href={brandHref}>
              {brandLabel}
            </Link>
            <span className="hidden text-xs text-muted-foreground md:inline">{surfaceLabel}</span>
          </div>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Surface navigation">
            {links.map((item) => (
              <Button asChild key={item.href} size="sm" variant="ghost">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        {trailing ?? null}
      </div>
    </header>
  )
}
