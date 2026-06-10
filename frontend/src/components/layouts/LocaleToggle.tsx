'use client'

import { Languages } from 'lucide-react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { routing } from '@/i18n/routing'

/**
 * Quick locale switch for the navbar. Toggles between the two supported locales
 * by replacing the locale segment of the current URL (next-intl navigation).
 */
export function LocaleToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const other = routing.locales.find((l) => l !== locale) ?? locale

  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1 px-2"
      aria-label="Switch language"
      title="Switch language"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      <Languages className="size-4" />
      <span className="text-xs font-medium uppercase">{other}</span>
    </Button>
  )
}
