## `src/components/providers/`

React Context providers and initialization components.

Files:
- `MswProvider.tsx` — Conditionally initialize MSW mock service worker
- `ThemeProvider.tsx` — Next.js theming provider
- `i18nProvider.tsx` — next-intl locale provider

**Rule**: Providers are 'use client' by default. Wrap app with all providers in root layout.
