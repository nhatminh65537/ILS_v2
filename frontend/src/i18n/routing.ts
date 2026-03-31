import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'always',
})

export type AppLocale = (typeof routing.locales)[number]

export const isAppLocale = (locale: string): locale is AppLocale =>
  routing.locales.includes(locale as AppLocale)
