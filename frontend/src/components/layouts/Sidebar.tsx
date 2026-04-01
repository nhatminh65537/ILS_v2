import Link from 'next/link'
import type { ShellNavItem } from './types'

type SidebarProps = {
  title: string
  items: readonly ShellNavItem[]
}

export function Sidebar({ title, items }: SidebarProps) {
  return (
    <aside className="sticky top-20 rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <nav className="flex flex-col gap-1" aria-label={title}>
        {items.map((item) => (
          <Link
            className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
