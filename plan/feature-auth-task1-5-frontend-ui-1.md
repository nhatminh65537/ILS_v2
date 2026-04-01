---
goal: Slice 1 Task 1.5 Frontend Authentication UI Implementation Plan
version: 1.0
date_created: 2026-04-01
last_updated: 2026-04-01
owner: Frontend Team
status: 'Completed'
tags: [feature, auth, frontend, slice-1, ui]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines deterministic implementation steps to complete Slice 1 Task 1.5 by delivering fully functional login/register UI flows aligned with existing backend auth endpoints, resolved architecture decisions, and current frontend foundation structure.

## 1. Requirements & Constraints

- **REQ-001**: Implement complete login UI flow at `frontend/app/[locale]/(auth)/login/page.tsx` using existing APIs from `frontend/src/services/auth.service.ts`.
- **REQ-002**: Implement complete register UI flow at `frontend/app/[locale]/(auth)/register/page.tsx` using existing APIs from `frontend/src/services/auth.service.ts`.
- **REQ-003**: Keep route and locale model unchanged (`/vi/login`, `/en/login`, `/vi/register`, `/en/register`) using `next-intl` setup in `frontend/src/i18n/routing.ts`.
- **REQ-004**: Use existing auth state architecture (`frontend/src/stores/auth.store.ts`, `frontend/src/hooks/useAuth.ts`) without introducing a second auth store.
- **REQ-005**: Preserve existing token refresh contract through `frontend/src/lib/axios.ts` interceptors and `POST /api/auth/token/refresh/`.
- **SEC-001**: Do not expose token payload details in UI logs, toasts, or query params.
- **SEC-002**: On auth failure, render sanitized user-facing messages only; no stack traces in UI.
- **OPS-001**: Follow resolved deployment assumption [Q-INFRA-09]: same-domain production default; avoid adding cross-origin client credential assumptions in Task 1.5.
- **CON-001**: Follow resolved path decision [Q-INFRA-01]: keep Next.js app routes under `frontend/app/` and shared logic under `frontend/src/`.
- **CON-002**: Keep API endpoint contracts unchanged (`/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/sso/redirect/`, `/api/auth/token/refresh/`).
- **GUD-001**: Reuse existing UI primitives from `frontend/src/components/ui/` where available; do not add parallel component systems.
- **PAT-001**: Keep UI-to-service layering: page component -> hook/store action -> service -> axios client.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Baseline and wire deterministic client-side auth form behavior with existing architecture.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Convert `frontend/app/[locale]/(auth)/login/page.tsx` to client-interactive flow by extracting submit logic into a client component `frontend/src/components/auth/login-form.tsx` and keep page file as composition shell. |  |  |
| TASK-002 | Convert `frontend/app/[locale]/(auth)/register/page.tsx` to client-interactive flow by extracting submit logic into `frontend/src/components/auth/register-form.tsx` and keep locale-aware layout unchanged. |  |  |
| TASK-003 | Implement controlled input state and submit handlers in `frontend/src/components/auth/login-form.tsx` using `useAuth().login` from `frontend/src/hooks/useAuth.ts`; include loading and duplicate-submit guard. |  |  |
| TASK-004 | Implement controlled input state and submit handlers in `frontend/src/components/auth/register-form.tsx` using `useAuth().register` from `frontend/src/hooks/useAuth.ts`; include password confirmation validation before API call. |  |  |
| TASK-005 | Add deterministic post-auth redirect in both forms using Next.js navigation: success login/register -> `/{locale}` home route or configured landing route constant in `frontend/src/constants/routes.ts` (create file if missing). |  |  |
| TASK-006 | Add SSO login action button in login form that performs direct browser navigation to `/api/auth/sso/redirect/` (HTTP 302 flow), aligned with FE contract in `docs/FE_CONVENTIONS.md`; do not expect JSON response body. |  |  |

### Implementation Phase 2

- GOAL-002: Harden UX behavior, error mapping, and translation coverage for production-ready auth screens.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Add field-level validation rules (required, min length, email format) and map validation errors to localized message keys in `frontend/messages/vi.json` and `frontend/messages/en.json` under `auth.*`. |  |  |
| TASK-008 | Add API error mapping utility `frontend/src/lib/auth-error-map.ts` that normalizes backend 400/401/403/429 responses into deterministic UI messages consumed by both forms. |  |  |
| TASK-009 | Ensure login/register form components read pending state from hook/store (`isLoading`) and disable all submit/SSO buttons during active request to prevent race conditions. |  |  |
| TASK-010 | Add explicit links between login/register pages and password/session follow-up placeholders that match current Task 1.4 status without exposing unavailable flows as active features. |  |  |
| TASK-011 | Verify axios 401 refresh behavior in `frontend/src/lib/axios.ts` does not cause infinite retry loops for `/api/auth/login/` and `/api/auth/register/`; add guard on auth endpoints if missing. |  |  |

### Implementation Phase 3

- GOAL-003: Add automated verification and documentation sync required by AGENT workflow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Add auth UI tests in `frontend/src/components/auth/__tests__/login-form.test.tsx` and `frontend/src/components/auth/__tests__/register-form.test.tsx` covering success path, validation failure, and API failure rendering. |  |  |
| TASK-013 | Add or update integration-level route tests in `frontend/src/app/[locale]/(auth)/__tests__/auth-pages.test.tsx` to verify locale routing and navigation links. |  |  |
| TASK-014 | Update `docs/STATUS.md` to mark Slice 1 frontend login/register task completion state and remaining Slice 1 items. |  |  |
| TASK-015 | Update `docs/API.md` only if endpoint usage contract changes are introduced during implementation; otherwise append a no-contract-change note in session report. |  |  |
| TASK-016 | Create implementation session report at `docs/reports/YYYY-MM-DD_slice1-task1-5-frontend-auth-ui.md` with algorithms, changed files, and caveats per `AGENT.md` completion rules. |  |  |

## 3. Alternatives

- **ALT-001**: Keep login/register pages as server-rendered static forms with plain HTML POST.
Reason not chosen: conflicts with JWT memory-storage and refresh-flow requirements.
- **ALT-002**: Implement auth logic directly inside route page files without reusable form components.
Reason not chosen: increases duplication and prevents deterministic component-level testing.
- **ALT-003**: Introduce a new global auth state library separate from Zustand.
Reason not chosen: duplicates existing architecture and increases migration risk.

## 4. Dependencies

- **DEP-001**: Backend auth endpoints from Slice 1.1-1.3 (`/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/token/refresh/`, `/api/auth/sso/redirect/`).
- **DEP-002**: Existing frontend auth foundation (`frontend/src/lib/axios.ts`, `frontend/src/services/auth.service.ts`, `frontend/src/stores/auth.store.ts`, `frontend/src/hooks/useAuth.ts`).
- **DEP-003**: Translation runtime and locale router (`next-intl`, `frontend/src/i18n/routing.ts`, `frontend/messages/*.json`).
- **DEP-004**: Existing UI component library configured in the repository (`shadcn` components under `frontend/src/components/ui/`).

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(auth)/login/page.tsx` - compose and render login client form container.
- **FILE-002**: `frontend/app/[locale]/(auth)/register/page.tsx` - compose and render register client form container.
- **FILE-003**: `frontend/src/components/auth/login-form.tsx` - login form state, validation, submit, redirect, and SSO action.
- **FILE-004**: `frontend/src/components/auth/register-form.tsx` - register form state, validation, submit, and redirect.
- **FILE-005**: `frontend/src/services/auth.service.ts` - keep endpoint contracts unchanged; for SSO use direct navigation helper without parsing redirect response payload.
- **FILE-006**: `frontend/src/hooks/useAuth.ts` - ensure login/register actions return deterministic success/error payloads for UI mapping.
- **FILE-007**: `frontend/src/lib/axios.ts` - refresh guard update for auth endpoints when needed.
- **FILE-008**: `frontend/src/lib/auth-error-map.ts` - deterministic backend-to-UI error mapping.
- **FILE-009**: `frontend/messages/vi.json` - auth validation and API error messages.
- **FILE-010**: `frontend/messages/en.json` - auth validation and API error messages.
- **FILE-011**: `docs/STATUS.md` - task state synchronization.
- **FILE-012**: `docs/reports/YYYY-MM-DD_slice1-task1-5-frontend-auth-ui.md` - session completion report.

## 6. Testing

- **TEST-001**: Unit test login form submit success sets auth state and navigates to localized landing route.
- **TEST-002**: Unit test login form handles 401/429 errors with mapped localized messages.
- **TEST-003**: Unit test register form validates password confirmation and blocks invalid submissions.
- **TEST-004**: Unit test register form handles backend username/email conflict errors deterministically.
- **TEST-005**: Unit test SSO action triggers direct browser navigation to `/api/auth/sso/redirect/` (no response-body parsing).
- **TEST-006**: Integration test localized routes render correct headings and cross-links (`/vi/login` <-> `/vi/register`, `/en/login` <-> `/en/register`).
- **TEST-007**: Verify no axios infinite-loop retry for 401 on auth endpoints via interceptor tests.
- **TEST-008**: Execute frontend test suite command (repository-standard) and record pass/fail in session report.

## 7. Risks & Assumptions

- **RISK-001**: Existing placeholder pages may contain server-only logic incompatible with client hooks after extraction.
- **RISK-002**: Inconsistent error payload shapes from backend endpoints may require fallback error mapping rules.
- **RISK-003**: Persisted auth store using localStorage may conflict with strict memory-only interpretation unless scoped to current accepted project baseline.
- **ASSUMPTION-001**: Slice 1 backend endpoints remain stable and reachable through `NEXT_PUBLIC_API_URL`.
- **ASSUMPTION-002**: Task 1.4 password reset/session listing remains out of scope and represented as non-active placeholders only.
- **ASSUMPTION-003**: Same-domain production default from [Q-INFRA-09] remains valid; no cross-origin credentials flow is required in this task.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/STATUS.md
- docs/IMPL_PLAN.md
- docs/DECISIONS.md
- docs/ARCHITECTURE.md
- docs/FE_CONVENTIONS.md
- docs/FE_SETUP.md
- docs/prd/01-authentication.md
