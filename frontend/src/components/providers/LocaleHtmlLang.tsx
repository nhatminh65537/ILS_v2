'use client'

import { useEffect } from 'react'

/**
 * Keeps <html lang> in sync with the active locale. The root layout renders a
 * static lang (it sits above the [locale] segment and can't know the locale),
 * so this client effect corrects it once the locale layout mounts.
 */
export function LocaleHtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return null
}
