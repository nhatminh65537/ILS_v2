# FE_CONVENTIONS.md

## Purpose

Coding and architecture conventions for frontend development in ILS v2.

## Folder Structure

- `frontend/app`: App Router pages/layouts
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
- For frontend behavior checks with MSW enabled, validate key screens in browser (`/vi`, `/vi/login`, `/vi/register`).

## FE-BE Contract Baseline (Completed Slices)

- Scope applies to completed slices: Slice 1 (auth backend), Slice 2 (RBAC backend), Slice 3 (system config backend), Slice 4 (frontend foundation).
- `GET /api/auth/sso/redirect/` is an HTTP redirect endpoint (302), not a JSON payload endpoint; frontend should navigate browser to this URL instead of expecting response body.
- Auth token payload user shape is minimal (`id`, `username`, `email`) for `register/login/sso-callback`.
- `POST /api/auth/identity/link/` returns `{detail, provider, external_id, created}`.
- `GET /api/admin/config/` returns an object grouped by category (`{[category]: SystemConfig[]}`), not a `{groups: [...]}` wrapper.
- Frontend pages for RBAC and admin config are still planned; no production frontend service contract is considered stable yet for `/api/admin/roles/*`, `/api/admin/permissions/*`, `/api/users/{id}/roles/*`, `/api/admin/config/*`.
