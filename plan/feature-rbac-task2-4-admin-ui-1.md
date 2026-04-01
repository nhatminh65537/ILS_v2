---
goal: Slice 2 Task 2.4 Admin RBAC Frontend UI Implementation Plan
version: 1.0
date_created: 2026-04-01
last_updated: 2026-04-01
owner: Frontend Team
status: 'Completed'
tags: [feature, rbac, authorization, frontend, slice-2]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines deterministic implementation steps for Slice 2 Task 2.4 to deliver locale-aware admin RBAC frontend pages, typed RBAC service APIs, and permission-aware rendering based on the existing backend RBAC contract.

## 1. Requirements & Constraints

- **REQ-001**: Implement admin RBAC overview page at `frontend/app/[locale]/(app)/admin/rbac/page.tsx` for role list, permission list, and role CRUD interactions.
- **REQ-002**: Implement role detail permission-assignment page at `frontend/app/[locale]/(app)/admin/rbac/roles/[id]/page.tsx` to assign and revoke permissions for a selected role.
- **REQ-003**: Implement user-role assignment page at `frontend/app/[locale]/(app)/admin/rbac/users/[id]/roles/page.tsx` to list, assign, and revoke role mappings for a user.
- **REQ-004**: Create typed RBAC service module `frontend/src/services/rbac.service.ts` with exact function contracts for all active RBAC endpoints in `docs/API.md` Section 3.10.
- **REQ-005**: Create typed RBAC contracts in `frontend/src/types/rbac.types.ts` and use these contracts in service, hooks, and page components.
- **REQ-006**: Keep route model locale-first (`/vi/*`, `/en/*`) and wire translations through `useTranslations` with synchronized keys in `frontend/messages/vi.json` and `frontend/messages/en.json`.
- **SEC-001**: Do not expose unauthorized actions in UI when RBAC permission keys are missing from JWT claims; hide or disable restricted actions deterministically.
- **SEC-002**: Do not bypass backend authorization errors in client; map 401/403/404/409 responses to explicit user-facing error states.
- **API-001**: Use canonical RBAC endpoints only: `/api/admin/permissions/`, `/api/admin/roles/`, `/api/admin/roles/{id}/permissions/`, `/api/users/{id}/roles/`, `/api/users/{id}/roles/{role_id}/`.
- **CON-001**: Follow `docs/FE_CONVENTIONS.md` service-layer rule: page and hook code must call only `frontend/src/services/*`, never call Axios directly.
- **CON-002**: Preserve existing token and refresh behavior implemented in `frontend/src/lib/axios.ts`; no changes to auth flow semantics in Task 2.4.
- **CON-003**: Keep this task frontend-only; do not change backend models or API route behavior.
- **GUD-001**: Use explicit loading, empty, success, and error states for each async operation.
- **PAT-001**: Keep architecture layering deterministic: route page -> feature component/hook -> `rbac.service.ts` -> `apiClient`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish deterministic RBAC frontend contracts and API integration baseline.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `frontend/src/types/rbac.types.ts` with explicit interfaces: `PermissionDto`, `RoleDto`, `RolePermissionAssignPayload`, `UserRoleAssignPayload`, `RbacListState`, and API response aliases used by RBAC pages. |  |  |
| TASK-002 | Create `frontend/src/services/rbac.service.ts` implementing exact functions: `listPermissions(includeInactive?: boolean)`, `listRoles()`, `getRoleById(id)`, `createRole(payload)`, `updateRole(id, payload)`, `deleteRole(id)`, `getRolePermissions(roleId)`, `assignPermissionToRole(roleId, permissionId)`, `revokePermissionFromRole(roleId, permissionId)`, `getUserRoles(userId)`, `assignRoleToUser(userId, roleId)`, `revokeRoleFromUser(userId, roleId)`. |  |  |
| TASK-003 | Add deterministic RBAC error normalization helper in `frontend/src/lib/rbac-error-map.ts` to map backend API errors into fixed UI message keys consumed by all RBAC pages. |  |  |
| TASK-004 | Create RBAC hook module `frontend/src/hooks/useRbac.ts` exposing composed operations (`loadRoles`, `loadPermissions`, `submitCreateRole`, `submitAssignPermission`, `submitAssignUserRole`) with request status flags for page components. |  |  |

### Implementation Phase 2

- GOAL-002: Deliver admin RBAC pages and reusable feature components under locale-aware App Router.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create reusable feature components under `frontend/src/components/features/rbac/`: `RoleListPanel.tsx`, `RoleFormDialog.tsx`, `PermissionAssignmentPanel.tsx`, `UserRoleAssignmentPanel.tsx`, `RbacActionToolbar.tsx` using existing `frontend/src/components/ui/*` primitives. |  |  |
| TASK-006 | Implement `frontend/app/[locale]/(app)/admin/rbac/page.tsx` to render roles table, create/edit/delete role actions, and permission overview panel using `useRbac` and translation keys `adminRbac.*`. |  |  |
| TASK-007 | Implement `frontend/app/[locale]/(app)/admin/rbac/roles/[id]/page.tsx` with role-permission assignment workflow: current assigned list, available permissions list, assign action, revoke action, and deterministic optimistic-state refresh. |  |  |
| TASK-008 | Implement `frontend/app/[locale]/(app)/admin/rbac/users/[id]/roles/page.tsx` with user-role assignment workflow: assigned roles list, assign role by `role_id`, revoke by `role_id`, and explicit not-found handling for invalid user IDs. |  |  |
| TASK-009 | Add admin navigation entry to RBAC page in shared authenticated navigation component (`frontend/src/components/layouts` or existing nav component location discovered during implementation) without breaking current dashboard navigation. |  |  |

### Implementation Phase 3

- GOAL-003: Enforce permission-aware rendering and complete i18n coverage for RBAC admin UI.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Create RBAC permission utility `frontend/src/lib/rbac-claim.ts` with deterministic helpers: `decodePermissionBitmap`, `hasPermissionKey`, `canManageRoles`, `canManageUserRoles` using JWT `permissions` and `pv` claims from auth state. |  |  |
| TASK-011 | Apply permission-aware rendering gates in all RBAC pages: hide create/edit/delete/assign controls when required permission keys are absent; render read-only fallback blocks with translated messaging. |  |  |
| TASK-012 | Extend translation dictionaries `frontend/messages/vi.json` and `frontend/messages/en.json` with synchronized `adminRbac` namespace for labels, toasts, loading states, and error states used by Task 2.4 pages/components. |  |  |

### Implementation Phase 4

- GOAL-004: Validate implementation and synchronize project tracking artifacts.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Run frontend validation commands from `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run build`; resolve all Task 2.4 introduced issues. |  |  |
| TASK-014 | Manual behavior verification via browser on locale routes: `/vi/admin/rbac`, `/en/admin/rbac`, `/vi/admin/rbac/roles/{id}`, `/vi/admin/rbac/users/{id}/roles` for success, unauthorized, and empty states. |  |  |
| TASK-015 | Update `docs/STATUS.md` to mark Slice 2 Task 2.4 completion and adjust pending frontend/admin backlog rows accordingly. |  |  |
| TASK-016 | Update `docs/FE_PAGE_INVENTORY.md` route statuses from `planned` to `implemented` for Task 2.4 pages and keep route/API notes aligned. |  |  |
| TASK-017 | Update `docs/API.md` notes section for RBAC to record frontend consumption readiness (no backend contract change) and create completion report `docs/reports/YYYY-MM-DD_slice2-task2-4-admin-rbac-ui.md`. |  |  |

## 3. Alternatives

- **ALT-001**: Implement RBAC admin UI directly in one page component without service and hook layers.
Reason not chosen: violates FE conventions and makes testing/reuse difficult.
- **ALT-002**: Reuse `users.service.ts` only for user-role operations and avoid a dedicated `rbac.service.ts`.
Reason not chosen: splits one domain contract across services and increases maintenance complexity.
- **ALT-003**: Render all admin RBAC actions unconditionally and rely only on backend 403 responses.
Reason not chosen: conflicts with permission-aware rendering requirement and degrades UX.

## 4. Dependencies

- **DEP-001**: Backend RBAC endpoints in `docs/API.md` Section 3.10 and implementation in `backend/api/admin_views.py`.
- **DEP-002**: Existing Axios auth/refresh behavior in `frontend/src/lib/axios.ts`.
- **DEP-003**: Existing auth state source (`frontend/src/stores/auth.store.ts` and related hooks) used to read JWT claims.
- **DEP-004**: Existing frontend UI primitives under `frontend/src/components/ui/`.
- **DEP-005**: Locale routing and translations configured in `frontend/src/i18n/*` and `frontend/messages/*`.

## 5. Files

- **FILE-001**: `frontend/src/types/rbac.types.ts` - RBAC domain request/response type contracts.
- **FILE-002**: `frontend/src/services/rbac.service.ts` - Typed RBAC HTTP service bindings.
- **FILE-003**: `frontend/src/hooks/useRbac.ts` - RBAC orchestration hook for page-level operations.
- **FILE-004**: `frontend/src/lib/rbac-error-map.ts` - RBAC API error normalization.
- **FILE-005**: `frontend/src/lib/rbac-claim.ts` - JWT permission-claim decode and permission checks.
- **FILE-006**: `frontend/src/components/features/rbac/RoleListPanel.tsx` - Role list and actions panel.
- **FILE-007**: `frontend/src/components/features/rbac/RoleFormDialog.tsx` - Create/update role form dialog.
- **FILE-008**: `frontend/src/components/features/rbac/PermissionAssignmentPanel.tsx` - Role-permission assignment UI.
- **FILE-009**: `frontend/src/components/features/rbac/UserRoleAssignmentPanel.tsx` - User-role assignment UI.
- **FILE-010**: `frontend/src/components/features/rbac/RbacActionToolbar.tsx` - Shared RBAC action controls and filters.
- **FILE-011**: `frontend/app/[locale]/(app)/admin/rbac/page.tsx` - RBAC overview route.
- **FILE-012**: `frontend/app/[locale]/(app)/admin/rbac/roles/[id]/page.tsx` - Role detail route.
- **FILE-013**: `frontend/app/[locale]/(app)/admin/rbac/users/[id]/roles/page.tsx` - User-role assignment route.
- **FILE-014**: `frontend/messages/vi.json` - Vietnamese RBAC UI text.
- **FILE-015**: `frontend/messages/en.json` - English RBAC UI text.
- **FILE-016**: `docs/STATUS.md` - Slice/task status synchronization.
- **FILE-017**: `docs/FE_PAGE_INVENTORY.md` - Route implementation status updates.
- **FILE-018**: `docs/API.md` - RBAC frontend readiness note (no contract changes).
- **FILE-019**: `docs/reports/YYYY-MM-DD_slice2-task2-4-admin-rbac-ui.md` - Implementation completion report.

## 6. Testing

- **TEST-001**: Verify role list renders from `GET /api/admin/roles/` and displays deterministic empty state when no custom roles exist.
- **TEST-002**: Verify create/update/delete role actions trigger expected API calls and update UI state without stale list artifacts.
- **TEST-003**: Verify role-permission assignment page can assign (`POST /api/admin/roles/{id}/permissions/`) and revoke (`DELETE /api/admin/roles/{id}/permissions/{perm_id}/`) with deterministic success/error feedback.
- **TEST-004**: Verify user-role assignment page can list, assign, and revoke user roles via `/api/users/{id}/roles/*` endpoints.
- **TEST-005**: Verify permission-aware rendering hides restricted actions when permission keys are absent in JWT claims.
- **TEST-006**: Verify locale parity for all RBAC labels and messages in Vietnamese and English.
- **TEST-007**: Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` successfully in `frontend/`.
- **TEST-008**: Manual browser checks for unauthorized and expired-token flows confirm redirect/error handling is consistent with existing auth behavior.

## 7. Risks & Assumptions

- **RISK-001**: JWT claim payload currently stored client-side may not include enough metadata for key-based UI gating without additional mapping logic.
- **RISK-002**: Concurrent role/permission updates can create temporary stale UI state if local optimistic updates diverge from server results.
- **RISK-003**: Missing admin navigation container or changing layout patterns can cause route discoverability issues if RBAC entry is not integrated consistently.
- **ASSUMPTION-001**: Backend RBAC endpoint payload structures remain stable as documented in `docs/API.md` Section 3.10.
- **ASSUMPTION-002**: Admin users used for verification have appropriate permissions to exercise full RBAC workflows.
- **ASSUMPTION-003**: Task 2.4 remains frontend-only and does not require backend contract additions in this execution window.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/FE_CONVENTIONS.md
- docs/FE_PAGE_INVENTORY.md
- docs/API.md
- docs/prd/02-authorization.md
- docs/reports/2026-03-31_slice2-task2-2-rbac-api.md
- docs/reports/2026-03-31_slice2-task2-3-handler-grants-bitmap.md
