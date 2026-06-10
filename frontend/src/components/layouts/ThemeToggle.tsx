'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/providers/ThemeProvider'

/**
 * Quick light/dark toggle for the navbar. Flips between light and dark (clearing
 * the `system` preference once the user explicitly chooses). Persisted via the
 * ThemeProvider so it survives reloads.
 */
export function ThemeToggle() {
  const t = useTranslations('navigation')
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      size="sm"
      variant="ghost"
      className="px-2"
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
