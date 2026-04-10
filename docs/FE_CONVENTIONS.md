# FE_CONVENTIONS.md

## Purpose

Coding and architecture conventions for frontend development in ILS v2.

## Folder Structure

- `frontend/app`: App Router pages/layouts
- `frontend/app/[locale]/(app)`: User surface (authenticated member/editor/admin app area)
- `frontend/app/[locale]/(admin)/admin`: Admin surface (dedicated admin auth entry + protected admin modules)
- `frontend/src/types`: Domain type contracts
- `frontend/src/services`: Typed API service layer
- `frontend/src/stores`: Zustand stores by domain
- `frontend/src/hooks`: Reusable hooks (`useAuth`, `useApi`)
- `frontend/src/components/ui`: shadcn-generated primitives
- `frontend/src/components/features`: Domain-specific smart components
- `frontend/src/components/layouts`: Layout containers
- `frontend/src/components/providers`: App-level providers (MSW, theme, i18n wrappers)
- `frontend/src/mocks`: MSW fixtures and handlers
- `frontend/src/i18n`: Locale routing/request configuration
- `frontend/messages`: Translation dictionaries (`vi.json`, `en.json`)

## Surface Architecture Rules

- User and admin must be treated as distinct frontend surfaces even when sharing one Next.js app.
- User surface routes and admin surface routes must not share the same layout wrapper.
- Admin entry route is `/{locale}/admin/login`; admin registration route is intentionally absent.
- Admin protected routes remain under `/{locale}/admin/*` for development compatibility.
- Vhost/domain-level split is deferred to deployment; code must keep route-level separation ready for future host split.

## Naming Conventions

- React components: PascalCase (`LoginForm.tsx`)
- Hooks: `useXxx.ts` (`useAuth.ts`, `useApi.ts`)
- Services: `*.service.ts` (`auth.service.ts`)
- Stores: `*.store.ts` (`auth.store.ts`)
- Types: `*.types.ts` by domain (`course.types.ts`)

## Service Layer Rules

- Components and hooks do not call Axios directly.
- All HTTP calls go through `src/services/*`.
- Services use shared client from `src/lib/axios.ts`.
- Response error handling is centralized in Axios interceptor.

## State Management Rules (Zustand)

- One store per domain; avoid monolithic global store.
- Use selector pattern in components/hooks:
  - Good: `useAuthStore((s) => s.user)`
  - Avoid: destructuring full store object.
- Persist only auth-relevant state (tokens/user) in auth store.
- UI store remains non-persistent.

## i18n Rules

- No hardcoded user-facing text in pages/components.
- Use `getTranslations` in server components and `useTranslations` in client components.
- Keep `vi.json` and `en.json` key structure identical.
- Route format is locale-first (`/vi/*`, `/en/*`).

## Client/Server Boundaries

- Mark interactive components/hooks with `'use client'`.
- Keep data-only and layout-only pages/components as server components when possible.
- Browser-only logic (localStorage, window events, MSW worker start) must stay in client components.

## Import Conventions

- Prefer path alias `@/` for `frontend/src/*`.
- Order imports by category:
  1. External packages
  2. Internal alias imports (`@/...`)
  3. Relative imports
- Keep type imports explicit with `import type` when possible.

## Testing/Verification Conventions

- Required checks before merge:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
- For frontend behavior checks with MSW enabled, validate key screens in browser (`/vi`, `/vi/login`, `/vi/register`, `/vi/admin/login`, `/vi/admin/rbac`, `/vi/admin/config`).

## Catalog Route Group Pattern

Feature pages that need a **content filter panel** instead of the standard navigation sidebar use a separate `(catalog)` route group.

### Structure

```
app/[locale]/
├── (app)/          ← standard user surface — auth gate + nav sidebar
│   ├── layout.tsx  showSidebar=true
│   └── dashboard/
├── (catalog)/      ← catalog surface — auth gate, NO nav sidebar
│   ├── layout.tsx  showSidebar=false
│   └── quizzes/
│       ├── page.tsx          → QuizCatalogClient
│       └── [id]/page.tsx     → QuizDetailClient
```

### Rules

- `(catalog)/layout.tsx` renders `UserAccessGate` + `UserLayout` with `showSidebar={false}`.
- Each catalog page client (`*CatalogClient.tsx`) renders its own **two-column layout**:
  ```tsx
  <div className="flex gap-6">
    <div className="hidden w-56 shrink-0 md:block"> {/* filter panel */} </div>
    <section className="min-w-0 flex-1"> {/* content grid */} </section>
  </div>
  ```
- The filter panel is always a sibling of the content grid, **not** injected through the layout hierarchy.
- All filter state lives in the `*CatalogClient` component (`useState`); no URL params, no context needed for MVP.
- Tags/categories for filter options are derived from the already-fetched content list via `useMemo` — no separate filter API call.
- Future catalog pages (courses `/learn`, challenges `/challenges`) must follow the same pattern: add a page directory under `(catalog)/`, not under `(app)/`.

### Why not layout sidebar injection?

Injecting a filter panel through the layout would require prop drilling (`params`-dependent filter options) through server layout files, which is incompatible with Next.js App Router's static layout model. Co-locating the filter panel inside the client component is simpler and avoids RSC/client boundary violations.

## FE-BE Contract Baseline (Completed Slices)

- Scope applies to completed slices: Slice 1 (auth backend), Slice 2 (RBAC backend), Slice 3 (system config backend), Slice 4 (frontend foundation).
- `GET /api/auth/sso/redirect/` is an HTTP redirect endpoint (302), not a JSON payload endpoint; frontend should navigate browser to this URL instead of expecting response body.
- Auth token payload user shape is minimal (`id`, `username`, `email`) for `register/login/sso-callback`.
- `POST /api/auth/identity/link/` returns `{detail, provider, external_id, created}`.
- `GET /api/admin/config/` returns an object grouped by category (`{[category]: SystemConfig[]}`), not a `{groups: [...]}` wrapper.
- Admin RBAC and system config frontend pages are implemented and served from dedicated admin surface routes (`/{locale}/admin/*`).
- MSW contract now includes admin handlers for `/api/admin/permissions/*`, `/api/admin/roles/*`, `/api/users/{id}/roles/*`, and `/api/admin/config/*` to support frontend-only validation.
