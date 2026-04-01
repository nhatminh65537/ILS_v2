# FE_SETUP.md

## Purpose

Frontend setup and quick-start for Slice 4 foundation.

## Prerequisites

- Node.js: >= 20
- npm: >= 10
- OS: Windows/macOS/Linux

## Install

```bash
cd frontend
npm install
```

## Environment Files

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MSW=true
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

Create/update `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_MSW=false
```

Notes:
- `NEXT_PUBLIC_API_URL` points to backend origin, service paths already include `/api/*`.
- MSW is enabled by default in development and disabled in production.
- For frontend-only verification, keep `NEXT_PUBLIC_ENABLE_MSW=true`.

## Development Commands

```bash
cd frontend
npm run dev
```

Default frontend URL:
- `http://localhost:4000`

Build and quality gates:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## MSW Behavior

- Worker file: `frontend/public/mockServiceWorker.js`
- Provider: `src/components/providers/MswProvider.tsx`
- Handlers: `src/mocks/handlers/*.handlers.ts`
- Fixtures: `src/mocks/data/fixtures.ts`

When `NEXT_PUBLIC_ENABLE_MSW=true`, mock handlers intercept API requests in browser.

Admin-specific handler coverage includes:
- `/api/admin/permissions/*`
- `/api/admin/roles/*`
- `/api/users/{id}/roles/*`
- `/api/admin/config/*`

## i18n Behavior

- Locales: `vi`, `en`
- Default locale: `vi`
- Root `/` redirects to `/vi`
- Locale routes: `app/[locale]/*`

## Surface Routing (Current)

- User surface routes remain under `/{locale}/*` with authenticated user shell at `/{locale}/dashboard`.
- Admin surface routes remain under `/{locale}/admin/*` for development.
- Dedicated admin auth entry: `/{locale}/admin/login`.
- Admin registration route is intentionally absent.

## Manual Smoke Checklist (Frontend-Only)

- User surface shell: `/{locale}/dashboard` has navbar + sidebar + content + footer.
- Admin login: `/{locale}/admin/login` renders dedicated admin auth form without register action.
- Admin protected shell: `/{locale}/admin/rbac` and `/{locale}/admin/config` render admin navbar/sidebar/content/footer after login.
- Admin data flow in MSW mode: RBAC and system config pages load with mock contracts (no backend dependency).

## Add More shadcn Components

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Currently installed primitives include button/input/dialog/sheet/dropdown/table/sonner/avatar/tabs and related basics.
