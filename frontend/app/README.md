## `app/`

Next.js App Router pages and layouts.

Currently:
- `layout.tsx` — Root layout with providers, global CSS
- `page.tsx` — Home page
- `globals.css` — Global Tailwind styles
- `[locale]/layout.tsx` — Locale provider wrapper
- `[locale]/(auth)/layout.tsx` — User auth surface wrapper
- `[locale]/(app)/layout.tsx` — User application shell (navbar/sidebar/footer)
- `[locale]/(admin)/admin/(auth)/layout.tsx` — Admin auth wrapper
- `[locale]/(admin)/admin/(protected)/layout.tsx` — Admin protected shell (navbar/sidebar/footer)

Primary route groups:
- `[locale]/(auth)` — User login/register routes
- `[locale]/(app)` — User authenticated pages
- `[locale]/(admin)/admin/(auth)` — Admin login route (`/{locale}/admin/login`)
- `[locale]/(admin)/admin/(protected)` — Admin protected pages (`/{locale}/admin/*`)

Rule:
- Keep locale-first routing and surface separation aligned with `docs/FE_PAGE_INVENTORY.md`.
- Do not re-couple admin modules into user route group.
