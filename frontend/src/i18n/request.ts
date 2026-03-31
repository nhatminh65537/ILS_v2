import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing, type AppLocale } from '@/i18n/routing'

export const loadMessages = async (locale: AppLocale) => {
  return (await import(`../../messages/${locale}.json`)).default
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
