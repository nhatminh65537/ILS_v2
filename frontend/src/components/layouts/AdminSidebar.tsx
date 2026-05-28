'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { getAdminSections } from '@/lib/rbac-claim'
import { useAuthStore } from '@/stores/auth.store'

export type AdminSidebarItem = {
  href: string
  label: string
  section?: string
}

type AdminSidebarProps = {
  title: string
  items: readonly AdminSidebarItem[]
}

export function AdminSidebar({ title, items }: AdminSidebarProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const sections = useMemo(() => getAdminSections(accessToken), [accessToken])

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.section) {
        return true
      }
      return sections.has(item.section)
    })
  }, [items, sections])

  return (
    <aside className="sticky top-20 rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <nav className="flex flex-col gap-1" aria-label={title}>
        {visibleItems.map((item) => (
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
