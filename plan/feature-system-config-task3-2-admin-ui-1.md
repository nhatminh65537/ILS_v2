---
goal: Slice 3 Task 3.2 System Config Admin UI Implementation Plan
version: 1.0
date_created: 2026-04-01
last_updated: 2026-04-01
owner: Frontend Team
status: 'Planned'
tags: [feature, system-config, frontend, admin, slice-3]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 3 Task 3.2 to deliver the locale-aware System Config Admin UI at `/[locale]/admin/config`, aligned with current backend contracts and frontend architecture conventions.

## 1. Requirements & Constraints

- **REQ-001**: Implement route page `frontend/app/[locale]/(app)/admin/config/page.tsx` as the entry point for system config admin UI.
- **REQ-002**: Implement client container `frontend/src/components/features/admin-config/SystemConfigPageClient.tsx` to orchestrate fetch, filter, edit, and refresh workflows.
- **REQ-003**: Implement typed service module `frontend/src/services/system-config.service.ts` with exact functions: `listSystemConfigs()`, `getSystemConfigByKey(key: string)`, `updateSystemConfigValue(key: string, payload: UpdateConfigPayload)`.
- **REQ-004**: Align `frontend/src/types/admin.types.ts` with active backend contract for list response shape `{[category]: SystemConfig[]}` and PATCH payload `{value: boolean|number|string|object|array}`.
- **REQ-005**: Render config rows grouped by `category` using accordion sections and deterministic category ordering.
- **REQ-006**: Render editor control by `value_type` exactly: `bool` -> toggle, `int` -> numeric input, `string` -> text input, `json` -> textarea with JSON validation, `secret` -> masked value with protected update workflow.
- **REQ-007**: Provide deterministic row states for `loading`, `saving`, `readonly`, `invalid-input`, and `api-error` without ambiguous behavior.
- **REQ-008**: Add localized UI strings for `adminConfig.*` namespace in both `frontend/messages/vi.json` and `frontend/messages/en.json` with identical key structure.
- **REQ-009**: Add dashboard navigation link to `/${locale}/admin/config` from `frontend/app/[locale]/(app)/dashboard/page.tsx` without removing existing admin RBAC link.
- **SEC-001**: Never display raw secret value from local state; persist only masked display (`***`) after any save/refresh cycle.
- **SEC-002**: Block update submission for `is_editable=false` keys in UI and show deterministic read-only message.
- **SEC-003**: Secret value updates must require explicit confirmation before calling PATCH.
- **API-001**: Use only active backend endpoints: `GET /api/admin/config/`, `GET /api/admin/config/{key}/`, `PATCH /api/admin/config/{key}/`.
- **API-002**: Handle API error contracts exactly: `403` with `{"detail": "Config is not editable"}`, `404` on unknown key, `400` on type mismatch.
- **CON-001**: Follow AGENT + FE conventions: route wrapper delegates to feature client, feature client delegates to hooks/services, no direct Axios usage in page components.
- **CON-002**: Keep locale-first routing pattern and `next-intl` usage (`useTranslations`) for all user-facing strings.
- **CON-003**: Keep this task frontend-only; do not modify backend route or serializer behavior.
- **CON-004**: Keep documentation synchronization in the same implementation session: update `docs/STATUS.md` and `docs/FE_PAGE_INVENTORY.md` when Task 3.2 is completed.
- **GUD-001**: Reuse existing UI primitives in `frontend/src/components/ui/*` and avoid introducing duplicate control components.
- **PAT-001**: Follow established RBAC pattern: `app route page` -> `Feature Client` -> `hook` -> `service` -> `apiClient`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align frontend contracts with active System Config API and prepare deterministic value conversion utilities.
- Completion Criteria: `admin.types.ts` and service signatures exactly match backend payloads; local validation utilities are available for all `value_type` values.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Refactor `frontend/src/types/admin.types.ts`: define `SystemConfigDto`, `SystemConfigGroupedMap = Record<string, readonly SystemConfigDto[]>`, `UpdateConfigPayload`, and `SystemConfigInputValue` union for edit controls. |  |  |
| TASK-002 | Create `frontend/src/services/system-config.service.ts` with functions `listSystemConfigs`, `getSystemConfigByKey`, `updateSystemConfigValue`; include `encodeConfigKey(key)` helper to preserve dotted keys in route path segments. |  |  |
| TASK-003 | Create `frontend/src/lib/system-config-value.ts` with deterministic functions `parseConfigValue`, `serializeConfigValue`, `validateConfigInput`, and `isMaskedSecretValue`. |  |  |
| TASK-004 | Create `frontend/src/lib/system-config-error-map.ts` to normalize Axios errors into translation keys: `adminConfig.errors.unauthenticated`, `adminConfig.errors.forbidden`, `adminConfig.errors.invalidType`, `adminConfig.errors.notEditable`, `adminConfig.errors.notFound`, `adminConfig.errors.unknown`. |  |  |

### Implementation Phase 2

- GOAL-002: Implement state orchestration and permission-aware capabilities for system config actions.
- Completion Criteria: hook exposes complete read/update workflow, category-grouped state, and capability checks for list/retrieve/patch/secret-view actions.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `frontend/src/hooks/useSystemConfig.ts` with exported operations `loadConfigs`, `refreshCategory`, `startEdit`, `cancelEdit`, `submitUpdate`, and `requestSecretReveal`; maintain per-row mutation state keyed by config key. |  |  |
| TASK-006 | Extend `frontend/src/types/rbac.types.ts` with `SystemConfigCapabilities` interface (`canList`, `canRetrieve`, `canUpdate`, `canViewSecret`). |  |  |
| TASK-007 | Extend `frontend/src/lib/rbac-claim.ts` with `canManageSystemConfig(accessToken, permissionsCatalog)` using keys `api.system_config.list`, `api.system_config.retrieve`, `api.system_config.partial_update`, and `system.config.view_secret`. |  |  |
| TASK-008 | In `useSystemConfig`, load permission catalog via `listPermissions(true)` from `frontend/src/services/rbac.service.ts` and compute `SystemConfigCapabilities`; gate secret-reveal and update actions from capability state. |  |  |

### Implementation Phase 3

- GOAL-003: Deliver the locale-aware admin config UI route and reusable feature components.
- Completion Criteria: `/vi/admin/config` and `/en/admin/config` render grouped config data, support typed edits, and enforce readonly/secret behavior in UI.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Create `frontend/src/components/features/admin-config/SystemConfigToolbar.tsx` for search, category filter, and refresh controls with props-only rendering (no API calls inside component). |  |  |
| TASK-010 | Create `frontend/src/components/features/admin-config/SystemConfigCategoryAccordion.tsx` to render grouped categories and row counts using current UI accordion primitives. |  |  |
| TASK-011 | Create `frontend/src/components/features/admin-config/SystemConfigRowEditor.tsx` to render value editor by `value_type` and show row-level validation/error/read-only states. |  |  |
| TASK-012 | Create `frontend/src/components/features/admin-config/SystemConfigPageClient.tsx` to integrate hook + toolbar + accordion + row editor, and handle secret update confirmation dialog before PATCH. |  |  |
| TASK-013 | Create `frontend/app/[locale]/(app)/admin/config/page.tsx` route wrapper that resolves locale params and renders `SystemConfigPageClient`. |  |  |
| TASK-014 | Update `frontend/app/[locale]/(app)/dashboard/page.tsx` to include direct navigation link to `/${locale}/admin/config` while preserving existing RBAC navigation. |  |  |

### Implementation Phase 4

- GOAL-004: Complete i18n coverage, quality validation, and documentation progress synchronization.
- Completion Criteria: lint/type/build pass, manual behavior checks pass, and progress documents reflect Task 3.2 completion state.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Add complete `adminConfig` translation namespace in `frontend/messages/vi.json` and `frontend/messages/en.json` with identical key tree for labels, actions, states, confirmations, and errors. |  |  |
| TASK-016 | Run frontend quality gates in `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run build`; resolve all Task 3.2-introduced issues. |  |  |
| TASK-017 | Execute manual verification on `/vi/admin/config` and `/en/admin/config`: grouped rendering, type-specific editing, readonly guard, secret masking flow, secret update confirmation, and API error handling. |  |  |
| TASK-018 | Update `docs/STATUS.md` and `docs/FE_PAGE_INVENTORY.md` to mark Task 3.2 page delivery as implemented, then add completion report `docs/reports/YYYY-MM-DD_slice3-task3-2-system-config-ui.md`. |  |  |

## 3. Alternatives

- **ALT-001**: Implement config UI with direct API calls inside route page component.
Reason not chosen: violates FE service-layer convention and reduces testability.
- **ALT-002**: Render all config values in generic text inputs only.
Reason not chosen: does not satisfy typed editor requirement by `value_type` and increases input error risk.
- **ALT-003**: Skip secret confirmation workflow and rely only on backend permission errors.
Reason not chosen: fails deterministic safety UX for sensitive value updates.

## 4. Dependencies

- **DEP-001**: Active System Config API contract in `docs/API.md` Section 3.9 and backend handlers in `backend/api/admin_views.py`.
- **DEP-002**: Existing RBAC services and claims helpers in `frontend/src/services/rbac.service.ts` and `frontend/src/lib/rbac-claim.ts`.
- **DEP-003**: Shared Axios client/interceptors in `frontend/src/lib/axios.ts`.
- **DEP-004**: Existing UI primitives in `frontend/src/components/ui/*`.
- **DEP-005**: i18n setup from `frontend/src/i18n/*` and locale dictionaries in `frontend/messages/*`.
- **DEP-006**: FE process constraints in `docs/FE_CONVENTIONS.md`, `docs/FE_PAGE_INVENTORY.md`, and AGENT execution checklist.

## 5. Files

- **FILE-001**: `frontend/src/types/admin.types.ts` - System Config API contracts and input value unions.
- **FILE-002**: `frontend/src/services/system-config.service.ts` - Typed API functions for list/detail/update config endpoints.
- **FILE-003**: `frontend/src/lib/system-config-value.ts` - Value-type parsing/serialization/validation utilities.
- **FILE-004**: `frontend/src/lib/system-config-error-map.ts` - Deterministic API-error to i18n-key mapping.
- **FILE-005**: `frontend/src/hooks/useSystemConfig.ts` - State orchestration and mutation workflow for config UI.
- **FILE-006**: `frontend/src/types/rbac.types.ts` - Add System Config capability contract.
- **FILE-007**: `frontend/src/lib/rbac-claim.ts` - Add capability resolver for system config permissions.
- **FILE-008**: `frontend/src/components/features/admin-config/SystemConfigToolbar.tsx` - Search/filter/refresh controls.
- **FILE-009**: `frontend/src/components/features/admin-config/SystemConfigCategoryAccordion.tsx` - Category-grouped config renderer.
- **FILE-010**: `frontend/src/components/features/admin-config/SystemConfigRowEditor.tsx` - Type-driven config row editor.
- **FILE-011**: `frontend/src/components/features/admin-config/SystemConfigPageClient.tsx` - Main client container for admin config page.
- **FILE-012**: `frontend/app/[locale]/(app)/admin/config/page.tsx` - Locale-aware route entry.
- **FILE-013**: `frontend/app/[locale]/(app)/dashboard/page.tsx` - Add navigation link to admin config route.
- **FILE-014**: `frontend/messages/vi.json` - Vietnamese translations for `adminConfig` namespace.
- **FILE-015**: `frontend/messages/en.json` - English translations for `adminConfig` namespace.
- **FILE-016**: `docs/STATUS.md` - Mark Task 3.2 completion when delivered.
- **FILE-017**: `docs/FE_PAGE_INVENTORY.md` - Update route status for `/vi/admin/config` and `/en/admin/config`.
- **FILE-018**: `docs/reports/YYYY-MM-DD_slice3-task3-2-system-config-ui.md` - Session completion report.

## 6. Testing

- **TEST-001**: Verify `listSystemConfigs` parses grouped response map and category accordion renders all categories from API.
- **TEST-002**: Verify `bool` keys submit boolean values only and reject non-boolean values before PATCH call.
- **TEST-003**: Verify `int` keys submit numeric values and surface deterministic validation error for invalid numeric input.
- **TEST-004**: Verify `json` keys validate JSON object/array format before PATCH and map backend 400 errors correctly.
- **TEST-005**: Verify `is_editable=false` rows disable edit controls and show read-only message without invoking PATCH.
- **TEST-006**: Verify `secret` rows remain masked after list/detail calls and require confirmation before update submission.
- **TEST-007**: Verify permission gating: without `system.config.view_secret`, reveal controls are hidden/disabled and fallback message is shown.
- **TEST-008**: Verify locale parity for all `adminConfig` labels/messages in Vietnamese and English.
- **TEST-009**: Run `npm run lint`, `npx tsc --noEmit`, `npm run build` successfully.
- **TEST-010**: Manual browser verification for success and error scenarios on `/vi/admin/config` and `/en/admin/config`.

## 7. Risks & Assumptions

- **RISK-001**: Backend currently masks secret values at serializer level; clear reveal may remain masked even with permission in current implementation.
- **RISK-002**: Inconsistent legacy assumptions in existing `admin.types.ts` (`groups[]` wrapper) can cause runtime mismatch if not fully refactored before UI integration.
- **RISK-003**: Permission catalog fetch failures can force false-negative capability checks, reducing available UI actions unexpectedly.
- **RISK-004**: Large config catalogs may reduce client rendering performance without memoized filtering and row-level state updates.
- **ASSUMPTION-001**: Backend route and payload contracts in `docs/API.md` Section 3.9 remain stable during Task 3.2 implementation.
- **ASSUMPTION-002**: Permission key `system.config.view_secret` exists and is present in permission catalog for capability evaluation.
- **ASSUMPTION-003**: Admin users used for verification have baseline admin access to list/retrieve/update config keys.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/FE_CONVENTIONS.md
- docs/FE_PAGE_INVENTORY.md
- docs/API.md
- docs/prd/10-system-config.md
- docs/reports/2026-03-30_slice3-task3-1-system-config-api.md
