## `src/i18n/`

next-intl internationalization configuration.

Files:
- `routing.ts` — Locale routing config (locales: ['vi', 'en'], defaultLocale: 'vi')
- `request.ts` — Server-side i18n request context and useTranslations wrapper

**Rule**: All UI text must use `useTranslations()` from next-intl. No hardcoded strings.
