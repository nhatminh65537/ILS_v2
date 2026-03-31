## `app/`

Next.js App Router pages and layouts.

Currently:
- `layout.tsx` — Root layout with providers, global CSS
- `page.tsx` — Home page
- `globals.css` — Global Tailwind styles

**For Slice 4 (Auth):**
- `[locale]/` — Locale-wrapped routes
- `[locale]/(auth)/` — Auth layout group
  - `login/page.tsx`
  - `register/page.tsx`

**Rule**: Use i18n localised routing. Auth pages use AuthLayout, app pages use AppShell.
