# Session Report: Frontend Surface Split and Admin Shell Isolation

**Date:** 2026-04-01
**Slices / Areas:** Slice 4 frontend architecture hardening; admin UI entry and shell isolation

## Summary

This session refactored frontend routing and layout architecture to separate User and Admin surfaces while preserving development URLs under `/{locale}/admin/*`. A dedicated admin login route was introduced, admin routes were moved out of the user route group, and both user/admin protected surfaces were standardized with complete shells (navbar, sidebar, content, footer). MSW mocks were upgraded to include RBAC and System Config contracts with JWT-like permission bitmap claims so frontend-only validation now behaves consistently with backend authorization expectations.

Follow-up hardening in the same session completed navbar session UX and guard behavior: home page keeps full shell but intentionally hides sidebar, avatar now exposes a dropdown menu (Profile + Logout), and admin entry-level guard now validates authorization capability before allowing `/{locale}/admin/*` protected modules.

## Completed Items

- [x] Created implementation plan `plan/architecture-frontend-surface-split-1.md`
- [x] Split App Router into user and admin surfaces using route groups
- [x] Added dedicated admin login page at `/{locale}/admin/login`
- [x] Removed admin-register entry from admin surface
- [x] Added reusable layout components: navbar, sidebar, footer, shell wrappers, admin access gate
- [x] Moved admin RBAC/config routes into dedicated admin protected surface
- [x] Updated admin/user page containers to render within shell architecture
- [x] Added RBAC and System Config MSW handlers matching active backend route contracts
- [x] Updated auth MSW tokens to include permission bitmap claims consumable by frontend capability checks
- [x] Updated home page shell behavior to hide sidebar while retaining navbar/footer
- [x] Replaced plain session text with avatar dropdown menu (`Profile`, `Logout`)
- [x] Tightened admin entry-level gate to block authenticated non-admin users before admin page logic
- [x] Added profile route scaffold to support session dropdown navigation (`/{locale}/profile`)
- [x] Synchronized architecture and frontend docs (`DECISIONS`, `ARCHITECTURE`, `IMPL_PLAN`, `STATUS`, `FE_*`, frontend README docs)
- [x] Ran frontend quality gates (`npm run lint`, `npx tsc --noEmit`, `npm run build`)

## Key Implementations

### 1. Route-Level Surface Split

1. Preserved locale-first routing and admin URL compatibility (`/{locale}/admin/*`).
2. Introduced admin auth and protected subgroups under `app/[locale]/(admin)/admin`.
3. Kept user authenticated content under `app/[locale]/(app)`.
4. Removed duplicate admin pages from user route group to prevent App Router URL conflicts.

### 2. Full Shell Layout Standardization

1. Introduced reusable shell primitives in `src/components/layouts`.
2. Built `UserLayout` and `AdminLayout` wrappers from common `AppShell`.
3. Added `AdminAccessGate` to redirect unauthenticated access to admin protected routes.
4. Updated dashboard/admin feature pages to render as shell content sections instead of standalone full-screen pages.

### 3. Mock Contract Alignment with Backend

1. Added shared permission catalog + bitmap token helper for frontend capability checks.
2. Implemented RBAC handlers for permissions, role CRUD, role-permission assignment, and user-role mapping routes.
3. Implemented System Config handlers for grouped list/detail/update contracts and value-type validation.
4. Updated auth handler token issuance to produce valid JWT-like payloads with permission claims and refresh user affinity.

### 4. Session UX and Guard Hardening

1. Added optional sidebar rendering in shared shell and disabled sidebar for locale home route only.
2. Added avatar dropdown session control with `Profile` navigation and explicit `Logout` action.
3. Added profile app route scaffold to ensure dropdown navigation resolves to a valid page.
4. Upgraded admin access guard from token-presence check to entry-level permission verification and redirect fallback for non-admin users.

## Files Changed

### Frontend Routing and Layout

- `frontend/app/[locale]/(app)/layout.tsx`
- `frontend/app/[locale]/(app)/profile/page.tsx`
- `frontend/app/[locale]/(auth)/layout.tsx`
- `frontend/app/[locale]/(auth)/login/page.tsx`
- `frontend/app/[locale]/(auth)/register/page.tsx`
- `frontend/app/[locale]/(app)/dashboard/page.tsx`
- `frontend/app/[locale]/page.tsx`
- `frontend/app/[locale]/(admin)/admin/page.tsx`
- `frontend/app/[locale]/(admin)/admin/(auth)/layout.tsx`
- `frontend/app/[locale]/(admin)/admin/(auth)/login/page.tsx`
- `frontend/app/[locale]/(admin)/admin/(protected)/layout.tsx`
- `frontend/app/[locale]/(admin)/admin/(protected)/rbac/page.tsx`
- `frontend/app/[locale]/(admin)/admin/(protected)/rbac/roles/[id]/page.tsx`
- `frontend/app/[locale]/(admin)/admin/(protected)/rbac/users/[id]/roles/page.tsx`
- `frontend/app/[locale]/(admin)/admin/(protected)/config/page.tsx`
- Deleted legacy admin route files under `frontend/app/[locale]/(app)/admin/*`

### Layout Components

- `frontend/src/components/layouts/types.ts`
- `frontend/src/components/layouts/Navbar.tsx`
- `frontend/src/components/layouts/Sidebar.tsx`
- `frontend/src/components/layouts/Footer.tsx`
- `frontend/src/components/layouts/AppShell.tsx`
- `frontend/src/components/layouts/AuthLayout.tsx`
- `frontend/src/components/layouts/UserLayout.tsx`
- `frontend/src/components/layouts/AdminLayout.tsx`
- `frontend/src/components/layouts/AdminAccessGate.tsx`
- `frontend/src/components/layouts/SessionNavControls.tsx`
- `frontend/src/components/features/auth/AdminLoginForm.tsx`

### Mock Handlers

- `frontend/src/mocks/handlers/admin-permissions.ts`
- `frontend/src/mocks/handlers/rbac.handlers.ts`
- `frontend/src/mocks/handlers/system-config.handlers.ts`
- `frontend/src/mocks/handlers/auth.handlers.ts`
- `frontend/src/mocks/handlers/index.ts`

### Localization

- `frontend/messages/en.json`
- `frontend/messages/vi.json`

### Documentation and Planning

- `plan/architecture-frontend-surface-split-1.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPL_PLAN.md`
- `docs/STATUS.md`
- `docs/FE_CONVENTIONS.md`
- `docs/FE_PAGE_INVENTORY.md`
- `docs/FE_SETUP.md`
- `frontend/app/README.md`
- `frontend/src/components/README.md`
- `frontend/src/components/layouts/README.md`
- `frontend/src/mocks/handlers/README.md`

## Verification

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed and generated routes include:
  - `/{locale}/admin/login`
  - `/{locale}/admin/rbac`
  - `/{locale}/admin/config`
  - `/{locale}/dashboard`
  - `/{locale}/profile`
- Browser verification (MSW mode) confirmed:
  - User shell renders navbar/sidebar/content/footer.
  - Admin login route is independent and has no register action.
  - Admin protected pages render with dedicated admin shell after login.
  - RBAC and System Config data load from mock handlers without backend integration.

## Caveats

- Admin access gate now performs entry-level capability validation before admin protected rendering; authorization remains backend-enforced as source of truth for sensitive operations.
- Deploy-time vhost split is intentionally deferred and not part of this implementation.
