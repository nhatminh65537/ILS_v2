---
goal: Fix MSW-Stage Quiz and Profile UI Bugs (H2, M2, M4, M5, L3)
version: 1.0
date_created: 2026-04-14
last_updated: 2026-04-14
owner: Frontend Team
status: Planned
tags: [refactor, bug, frontend, msw, i18n, quiz, profile]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic fixes for five active bugs observed in MSW-stage testing: H2, M2, M4, M5, and L3. The plan is constrained to contract-safe frontend and mock-layer changes, with backend verification included where needed.

## 1. Requirements & Constraints

- **REQ-001**: Fix H2 by enforcing status-aware admin quiz list behavior for `draft`, `published`, `archived`, and `all` flows in MSW mode.
- **REQ-002**: Fix M2 by guaranteeing a new quiz session instance on Try Again (state reset + new WS lifecycle).
- **REQ-003**: Fix M4 by restoring ICU interpolation for `device` in profile session revoke confirmation.
- **REQ-004**: Fix M5 by disabling account save action when no field changes exist.
- **REQ-005**: Fix L3 by restoring ICU interpolation for `title` in admin quiz delete confirmation.
- **SEC-001**: Do not weaken authentication/authorization behavior on admin surfaces.
- **SEC-002**: Do not expose private fields or bypass server-side validation rules.
- **API-001**: Preserve current API contract usage in frontend services: `GET /api/quiz/quizzes/` with optional `status` query.
- **API-002**: Preserve backend user account contract: `PATCH /api/users/me/account/` must still rely on backend uniqueness validation.
- **CON-001**: Keep changes limited to FE + MSW unless a backend regression is proven.
- **CON-002**: Keep locale parity for both `vi` and `en` message catalogs.
- **CON-003**: Keep existing route topology under `/{locale}/...` and admin/user surface split unchanged.
- **GUD-001**: Follow existing architecture notes in AGENT and docs without introducing new frameworks.
- **GUD-002**: Prefer minimal, explicit diffs and no unrelated refactors.
- **PAT-001**: Maintain current flow pattern: UI -> hook -> service -> API/mock handler.
- **PAT-002**: Maintain next-intl ICU message format compatibility (do not escape placeholders unintentionally).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Lock root-cause evidence and implementation boundaries before code changes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Confirm H2 path end-to-end: `frontend/src/components/features/quizzes/AdminQuizListPageClient.tsx` calls `loadList({ status })`, `frontend/src/hooks/useAdminQuizzes.ts` forwards params, `frontend/src/services/quizzes.service.ts` sends query, and `frontend/src/mocks/handlers/quizzes.handlers.ts` currently ignores `status` in GET list handler. |  |  |
| TASK-002 | Confirm M2 lifecycle issue: `frontend/src/components/features/quizzes/QuizFinishScreen.tsx` pushes same URL and refreshes; `frontend/src/components/features/quizzes/QuizSessionClient.tsx` does not remount; `frontend/src/hooks/useQuizSession.ts` effect depends on `quizId` only. |  |  |
| TASK-003 | Confirm M4 and L3 ICU cause: in `frontend/messages/vi.json` and `frontend/messages/en.json`, strings using `'{device}'` and `'{title}'` escape placeholders and render literal braces under ICU rules. |  |  |
| TASK-004 | Confirm M5 behavior gap: `frontend/src/components/features/profile/AccountForm.tsx` validates no-change only on submit, but save button remains enabled before submit. |  |  |

### Implementation Phase 2

- GOAL-002: Fix H2 and i18n interpolation defects (M4, L3) without API contract changes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Update GET handler in `frontend/src/mocks/handlers/quizzes.handlers.ts` to parse `status` query and filter `quizzesFixture` before pagination. Rule: `status=draft|published|archived` => exact status filter; missing status or `status=all` => return all rows for admin list parity in current MSW scenario. |  |  |
| TASK-006 | Keep deterministic handler order in `frontend/src/mocks/handlers/index.ts`; ensure quizzes HTTP handler behavior remains stable with existing WS handler registration. |  |  |
| TASK-007 | Update `adminQuizzes.confirmDelete` in both `frontend/messages/vi.json` and `frontend/messages/en.json` from quoted placeholder pattern to ICU interpolation-safe pattern using `{title}`. |  |  |
| TASK-008 | Update `profile.sessions.confirm.revokeOneDescription` in both `frontend/messages/vi.json` and `frontend/messages/en.json` from quoted placeholder pattern to ICU interpolation-safe pattern using `{device}`. |  |  |

### Implementation Phase 3

- GOAL-003: Fix session restart remount logic (M2) and account save UX gate (M5).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Update `frontend/app/[locale]/(catalog)/quizzes/[id]/session/page.tsx` to accept `searchParams` and pass a restart key to `QuizSessionClient` so URL-based restart nonce forces remount. |  |  |
| TASK-010 | Update `frontend/src/components/features/quizzes/QuizFinishScreen.tsx` `handleTryAgain` to navigate to the same route with deterministic restart nonce query (example: `?restart=<epoch_ms>`), using replacement navigation to avoid stack pollution. |  |  |
| TASK-011 | Verify `frontend/src/hooks/useQuizSession.ts` cleanup path closes old socket on unmount and requires no additional API changes; add explicit comment only if needed for restart contract clarity. |  |  |
| TASK-012 | Update `frontend/src/components/features/profile/AccountForm.tsx` to compute `hasChanges` from normalized username/email fields and set submit disabled state to `saving || !hasChanges`; remove no-change submit error path because it becomes unreachable in normal UI flow. |  |  |

### Implementation Phase 4

- GOAL-004: Validate fixes against checklist cases and synchronize tracker documents.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Execute targeted scenario checks for D-3.1, D-3.2, D-3.3, C-6.7, C-2-6, B-4-1, and D-4.3 against updated FE+MSW behavior. |  |  |
| TASK-014 | Run static validation in frontend workspace: lint and build commands; if available, run integration Playwright spec for admin/profile/quiz paths. |  |  |
| TASK-015 | Update `docs/BUGS.md`: move fixed entries H2, M2, M4, M5, L3 to Fixed section with fix date and concise resolution notes. |  |  |
| TASK-016 | Create session report in `docs/reports/` and update `docs/STATUS.md` to reflect bug-fix completion in current session scope. |  |  |

## 3. Alternatives

- **ALT-001**: Fix H2 in UI-only by client-side filtering after list load. Rejected because it hides contract mismatch in mock transport layer.
- **ALT-002**: Force restart by internal reducer reset only in `useQuizSession`. Rejected because route-level remount is the clearer and deterministic restart boundary.
- **ALT-003**: Keep quoted ICU placeholders and inject preformatted strings. Rejected because it breaks localization consistency and future translations.
- **ALT-004**: Keep submit enabled for M5 and show error on submit. Rejected because checklist and UX expectation require proactive disable state.

## 4. Dependencies

- **DEP-001**: Existing next-intl ICU message formatting behavior in frontend runtime.
- **DEP-002**: Existing MSW v2 handler chain in `frontend/src/mocks/handlers/index.ts`.
- **DEP-003**: Existing Next.js App Router behavior for same-route navigation and client remount.
- **DEP-004**: Existing backend quiz list behavior in `backend/api/views/quizzes.py` (`status` query support) used as reference contract.

## 5. Files

- **FILE-001**: `frontend/src/mocks/handlers/quizzes.handlers.ts` - apply status-aware filtering in quiz list handler before pagination.
- **FILE-002**: `frontend/messages/vi.json` - fix ICU interpolation for `adminQuizzes.confirmDelete` and `profile.sessions.confirm.revokeOneDescription`.
- **FILE-003**: `frontend/messages/en.json` - fix ICU interpolation for `adminQuizzes.confirmDelete` and `profile.sessions.confirm.revokeOneDescription`.
- **FILE-004**: `frontend/app/[locale]/(catalog)/quizzes/[id]/session/page.tsx` - pass restart nonce and remount key to session client.
- **FILE-005**: `frontend/src/components/features/quizzes/QuizFinishScreen.tsx` - emit restart nonce in Try Again navigation.
- **FILE-006**: `frontend/src/components/features/profile/AccountForm.tsx` - add deterministic `hasChanges` gating for submit button.
- **FILE-007**: `docs/BUGS.md` - move fixed entries to history with date and resolution summary.
- **FILE-008**: `docs/reports/YYYY-MM-DD_<slug>.md` - session completion report for bug-fix implementation.
- **FILE-009**: `docs/STATUS.md` - synchronize completion state after fixes are merged.

## 6. Testing

- **TEST-001**: Admin status filter draft: on `/admin/quizzes`, selecting Draft returns only draft rows (D-3.1).
- **TEST-002**: Admin status filter published: selecting Published returns only published rows (D-3.2).
- **TEST-003**: Admin status filter archived: selecting Archived returns empty state when no archived rows exist (D-3.3).
- **TEST-004**: Delete confirmation interpolation: dialog includes actual quiz title for both `vi` and `en` locales (D-4.3, L3).
- **TEST-005**: Session revoke dialog interpolation: description includes actual device name for both `vi` and `en` locales (C-2-6, M4).
- **TEST-006**: Try Again restart: from finish screen, clicking Try Again starts a fresh session at question 1 (C-6.7, M2).
- **TEST-007**: Account save button gate: with unchanged fields, save button is disabled; with username/email change, button is enabled (B-4-1, M5).
- **TEST-008**: Regression smoke: `npm run lint` and `npm run build` complete without new errors in frontend workspace.

## 7. Risks & Assumptions

- **RISK-001**: If restart nonce is not wired to component key/remount boundary, M2 may become flaky instead of fixed.
- **RISK-002**: If ICU message syntax is partially corrected in one locale only, i18n behavior will diverge between `vi` and `en`.
- **RISK-003**: MSW list behavior differs from backend auth-aware list behavior; this plan assumes admin-path tests in MSW context only.
- **ASSUMPTION-001**: Backend contract for `status` query in quiz list is valid and should not be changed for this bug-fix scope.
- **ASSUMPTION-002**: Existing profile/account API remains authoritative for uniqueness checks; frontend only gates UX state.
- **ASSUMPTION-003**: M3 and other deferred MSW cross-surface issues remain out of scope for this plan.

## 8. Related Specifications / Further Reading

[AGENT.md]
[docs/BUGS.md]
[docs/API.md]
[docs/STATUS.md]
[docs/DECISIONS.md]
[docs/intests/2026-04-13_slice7-quiz-ui.md]
[docs/intests/2026-04-13_slice8-profile-users-ui.md]
[docs/reports/2026-04-14_slice7-quiz-ui-retest-msw.md]
