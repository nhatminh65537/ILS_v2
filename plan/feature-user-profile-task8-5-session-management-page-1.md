---
goal: Feature plan for Slice 8 Task 8.5 Frontend Session Management Page
version: 1.0
date_created: 2026-04-13
last_updated: 2026-04-13
owner: Frontend Team B
status: Planned
tags: [feature, frontend, user-profile, session-management, slice-8, task-8.5]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 8 Task 8.5: build the authenticated user session management page at `/{locale}/profile/sessions` using existing auth session APIs. The scope includes listing active sessions, highlighting the current session, revoking non-current sessions, and revoking all other sessions. The plan follows current API contracts and frontend conventions without backend schema changes.

## 1. Requirements & Constraints

- **REQ-001**: Implement route `frontend/app/[locale]/(app)/profile/sessions/page.tsx` as the Task 8.5 entry page.
- **REQ-002**: Render session list from `GET /api/auth/sessions/` and display `device_info`, `created_at`, `last_used_at`, and `expires_at`.
- **REQ-003**: Highlight exactly one current session in UI using deterministic rule: first item from API response (backend order is `-last_used_at, -id`).
- **REQ-004**: Prevent revoking the current session in both UI and hook logic.
- **REQ-005**: Implement per-row revoke using `DELETE /api/auth/sessions/{id}/` for non-current sessions only.
- **REQ-006**: Implement `Revoke all other sessions` action by deleting every non-current session ID from current list.
- **REQ-007**: After any successful revoke action, refresh list state from API to avoid stale UI.
- **REQ-008**: Provide explicit loading, empty, success, and error states.
- **REQ-009**: Add route discoverability from authenticated user UI (session menu and/or profile settings section link).
- **REQ-010**: Add matching i18n keys for English and Vietnamese with identical key structure.
- **SEC-001**: Frontend must never expose or rely on `refresh_token_hash`; only consume safe list fields from auth session serializer.
- **SEC-002**: All session API calls must use shared Axios client `frontend/src/lib/axios.ts` through service layer only.
- **SEC-003**: Do not use `POST /api/auth/logout-all/` for `revoke all other sessions` because it also revokes current session.
- **API-001**: Use only active endpoints documented as Stable: `GET /api/auth/sessions/`, `DELETE /api/auth/sessions/{id}/`.
- **API-002**: Treat delete `404` as non-owned/non-existing session and surface non-blocking row-level error message.
- **API-003**: Session list contract is array response; do not assume paginated envelope.
- **CON-001**: Task dependency `Task 1.4A` is satisfied and is required baseline for this frontend implementation.
- **CON-002**: Keep locale-first route contract (`/vi/*`, `/en/*`) and user surface group `app/[locale]/(app)`.
- **CON-003**: Follow `docs/FE_CONVENTIONS.md` service-layer rule: no direct Axios in components/hooks.
- **CON-004**: Keep user/admin surface split unchanged (Decision `Q-INFRA-10` resolved Option A).
- **CON-005**: No backend model or migration changes are allowed in this task plan.
- **GUD-001**: Use client/server boundary correctly: server page for heading shell, client component for interactive session actions.
- **GUD-002**: Reuse established hook state pattern from `useAdminUsers` (`data + isLoading + errorKey + mutation states`).
- **PAT-001**: Use deterministic helper functions for current-session selection and non-current session ID extraction.
- **PAT-002**: Keep MSW contract synchronized with real API behavior for session list and revoke actions.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish typed session contract and service functions.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In `frontend/src/types/user.types.ts`, add DTO `AuthSessionListItem` with fields exactly: `id`, `device_info`, `last_used_at`, `expires_at`, `created_at`; keep existing `UserSession` unchanged for backward compatibility. |  |  |
| TASK-002 | In `frontend/src/services/auth.service.ts`, add function `listSessions(): Promise<AuthSessionListItem[]>` calling `GET /api/auth/sessions/`. |  |  |
| TASK-003 | In `frontend/src/services/auth.service.ts`, add function `revokeSession(sessionId: number): Promise<void>` calling `DELETE /api/auth/sessions/{id}/`. |  |  |
| TASK-004 | Create `frontend/src/lib/auth-sessions.ts` with pure helpers `getCurrentSessionId(sessions)` and `getOtherSessionIds(sessions)` using stable index-based rule (`sessions[0]`). |  |  |

### Implementation Phase 2

- GOAL-002: Implement session state orchestration hook.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `frontend/src/hooks/useAuthSessions.ts` as a client hook with state slices: `sessionsState`, `isMutating`, `mutationErrorKey`, `mutationSuccessKey`. |  |  |
| TASK-006 | Implement `loadSessions()` in `useAuthSessions.ts` using `listSessions()` and deterministic sort guard by `last_used_at desc` then `id desc` before storing state. |  |  |
| TASK-007 | Implement `revokeSessionById(sessionId: number)` in `useAuthSessions.ts` with guard: if `sessionId === currentSessionId`, return `{ok:false, reason:'currentSessionProtected'}` and skip API call. |  |  |
| TASK-008 | Implement `revokeAllOtherSessions()` in `useAuthSessions.ts` to delete IDs from `getOtherSessionIds(sessionsState.data)` using `Promise.allSettled`, then refresh with `loadSessions()`. |  |  |
| TASK-009 | Map API failures into deterministic i18n keys: `errors.loadFailed`, `errors.revokeFailed`, `errors.revokeAllFailed`, `errors.currentSessionProtected`. |  |  |

### Implementation Phase 3

- GOAL-003: Build page UI and interaction flows for sessions.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Create server page `frontend/app/[locale]/(app)/profile/sessions/page.tsx` with title/subtitle from `profile` namespace and mount client view component. |  |  |
| TASK-011 | Create client component `frontend/src/components/features/profile/ProfileSessionsView.tsx` and wire `useAuthSessions` lifecycle load in `useEffect`. |  |  |
| TASK-012 | Render session table/list rows showing device label fallback (`Unknown device`) when `device_info` is empty and formatted timestamps by locale. |  |  |
| TASK-013 | Add current-session visual badge on the row where `id === currentSessionId` and disable per-row revoke button for that row. |  |  |
| TASK-014 | Add row-level revoke confirmation dialog before deleting non-current session. |  |  |
| TASK-015 | Add top-level action button `Revoke all other sessions` with confirmation dialog and disabled state when only current session exists. |  |  |
| TASK-016 | Implement deterministic empty state message when session list length is `0` and fallback message when only current session remains after bulk revoke. |  |  |

### Implementation Phase 4

- GOAL-004: Integrate navigation, i18n, and MSW contract support.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Update `frontend/src/components/layouts/SessionNavControls.tsx` to add dropdown link `/{locale}/profile/sessions` using `navigation.sessions` key. |  |  |
| TASK-018 | Update `frontend/src/components/features/profile/ProfileSettingsView.tsx` to add a non-deferred card or link entry that navigates to session management page. |  |  |
| TASK-019 | Add new keys under `profile.sessions.*` and `navigation.sessions` in `frontend/messages/en.json`. |  |  |
| TASK-020 | Mirror the exact key structure from English into `frontend/messages/vi.json`. |  |  |
| TASK-021 | In `frontend/src/mocks/data/fixtures.ts`, add mutable fixture `authSessionsFixture` aligned with API fields and deterministic timestamp values. |  |  |
| TASK-022 | In `frontend/src/mocks/handlers/auth.handlers.ts`, add `GET */api/auth/sessions/` and `DELETE */api/auth/sessions/:id/` handlers with ownership-safe behavior simulation and in-memory mutation. |  |  |

### Implementation Phase 5

- GOAL-005: Verify behavior and close documentation consistency requirements.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Add frontend behavior test coverage for session page flows (load list, protect current session, revoke one non-current, revoke all others) in existing Playwright integration suite or a dedicated profile sessions spec. |  |  |
| TASK-024 | Run verification commands in `frontend`: `npm run lint`, `npx tsc --noEmit`, `npm run build`. |  |  |
| TASK-025 | Perform manual MSW smoke checks: `/vi/profile/sessions` and `/en/profile/sessions` for loading, empty, and mutation flows. |  |  |
| TASK-026 | After implementation completion, update `docs/FE_PAGE_INVENTORY.md`, `docs/STATUS.md`, and session report under `docs/reports/` in the same session per process rules. |  |  |

## 3. Alternatives

- **ALT-001**: Extend backend `GET /api/auth/sessions/` response with `is_current` boolean. Rejected for this task because Task 8.5 is planned as frontend implementation over stable Task 1.4A API contract.
- **ALT-002**: Use `POST /api/auth/logout-all/` for bulk revoke. Rejected because it revokes current session and violates `cannot revoke own current session` requirement.
- **ALT-003**: Detect current session by matching browser `userAgent` string to `device_info`. Rejected because multiple sessions can share same device info and this is less deterministic than API ordering.
- **ALT-004**: Add no bulk action and require manual one-by-one deletes. Rejected because Task 8.5 explicitly requires `Revoke all other sessions` control.

## 4. Dependencies

- **DEP-001**: `docs/IMPL_PLAN.md` Task 8.5 contract and dependency note on Task 1.4A.
- **DEP-002**: `docs/API.md` authentication endpoint stability for `/api/auth/sessions/*`.
- **DEP-003**: `backend/auth_app/serializers.py` (`SessionListItemSerializer`) safe response field contract.
- **DEP-004**: `backend/auth_app/services/session_service.py` ordering contract (`-last_used_at, -id`) used for deterministic current-session selection.
- **DEP-005**: `docs/FE_CONVENTIONS.md` service-layer, i18n, and verification conventions.
- **DEP-006**: `frontend/src/stores/auth.store.ts` for authenticated runtime state and request authorization context.
- **DEP-007**: Existing UI primitives in `frontend/src/components/ui/*` (Card, Table, Badge, Button, Dialog, Skeleton).

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(app)/profile/sessions/page.tsx` - server page entry for session management route.
- **FILE-002**: `frontend/src/components/features/profile/ProfileSessionsView.tsx` - client interaction layer and rendering.
- **FILE-003**: `frontend/src/hooks/useAuthSessions.ts` - session list and revoke orchestration hook.
- **FILE-004**: `frontend/src/services/auth.service.ts` - `listSessions` and `revokeSession` API calls.
- **FILE-005**: `frontend/src/lib/auth-sessions.ts` - deterministic helper functions for current and other session IDs.
- **FILE-006**: `frontend/src/types/user.types.ts` - session DTO types for auth session list payload.
- **FILE-007**: `frontend/src/components/layouts/SessionNavControls.tsx` - navigation link to session page.
- **FILE-008**: `frontend/src/components/features/profile/ProfileSettingsView.tsx` - profile settings integration link/card to sessions page.
- **FILE-009**: `frontend/messages/en.json` - English translation keys for session page and navigation.
- **FILE-010**: `frontend/messages/vi.json` - Vietnamese translation keys mirrored from English structure.
- **FILE-011**: `frontend/src/mocks/data/fixtures.ts` - session fixture data for MSW.
- **FILE-012**: `frontend/src/mocks/handlers/auth.handlers.ts` - MSW handlers for list/revoke session endpoints.
- **FILE-013**: `frontend/playwright.integration.test.ts` (or dedicated new spec) - behavioral regression tests for Task 8.5.
- **FILE-014**: `docs/FE_PAGE_INVENTORY.md` - mark `/profile/sessions` implemented after completion.
- **FILE-015**: `docs/STATUS.md` - update Slice 8 task completion entry after completion.
- **FILE-016**: `docs/reports/YYYY-MM-DD_slice8-task8-5-frontend-session-management.md` - required session completion report.

## 6. Testing

- **TEST-001**: Route render test: authenticated user can open `/{locale}/profile/sessions` and view page header.
- **TEST-002**: Data load test: session rows are rendered from `GET /api/auth/sessions/` with expected columns/labels.
- **TEST-003**: Current session protection test: current session row shows badge and revoke button is disabled.
- **TEST-004**: Revoke single session test: deleting a non-current session removes the row after refresh.
- **TEST-005**: Revoke current session guard test: hook rejects current-session deletion path and shows `errors.currentSessionProtected`.
- **TEST-006**: Revoke all other sessions test: action leaves exactly one session (current) in list.
- **TEST-007**: Empty state test: when API returns empty array, empty message is shown with no action errors.
- **TEST-008**: Error state test: API 500 on list shows load error; API failure on delete shows mutation error.
- **TEST-009**: i18n parity test: both `en` and `vi` have identical `profile.sessions.*` and `navigation.sessions` key paths.
- **TEST-010**: Run `npm run lint` in `frontend` and ensure zero new lint errors.
- **TEST-011**: Run `npx tsc --noEmit` in `frontend` and ensure type checks pass.
- **TEST-012**: Run `npm run build` in `frontend` and ensure production build passes.

## 7. Risks & Assumptions

- **RISK-001**: Current session detection is inferred from list ordering, not explicit backend `is_current`; concurrent activity on another device can change which row is first.
- **RISK-002**: Bulk revoke action depends on multiple DELETE calls; partial failures can leave mixed state and require clear post-action summary.
- **RISK-003**: Missing MSW parity for `/api/auth/sessions/*` can cause false frontend failures in local mock mode.
- **RISK-004**: Translation key drift between `en.json` and `vi.json` can break runtime lookups.
- **ASSUMPTION-001**: Backend ordering in `SessionService.list_active_sessions_for_user` remains `-last_used_at, -id` during this task.
- **ASSUMPTION-002**: Session list endpoint remains non-paginated array response for MVP scope.
- **ASSUMPTION-003**: Auth interceptor already injects token headers for session endpoints; no additional auth plumbing is needed.
- **ASSUMPTION-004**: Documentation authority for endpoint path is `docs/API.md` and `docs/IMPL_PLAN.md`; older PRD path `/api/users/me/sessions/` is treated as legacy wording.

## 8. Related Specifications / Further Reading

docs/IMPL_PLAN.md
docs/API.md
docs/STATUS.md
docs/DECISIONS.md
docs/FE_CONVENTIONS.md
docs/FE_PAGE_INVENTORY.md
docs/prd/01-authentication.md
docs/prd/06-user-profile.md
CLAUDE.md
AGENT.md