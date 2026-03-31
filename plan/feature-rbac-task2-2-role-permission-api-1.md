---
goal: Slice 2 Task 2.2 Role Permission CRUD API Completion Plan
version: 1.0
date_created: 2026-03-31
last_updated: 2026-03-31
owner: Backend Team
status: 'Completed'
tags: [feature, rbac, authorization, api, backend]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines deterministic implementation steps to complete Slice 2 Task 2.2 by standardizing RBAC API contracts, enforcing authorization guards, and aligning code/tests/docs with the current architecture decisions.

## 1. Requirements & Constraints

- **REQ-001**: Implement and stabilize RBAC admin APIs under the canonical namespace `/api/admin/*` for roles and permissions management.
- **REQ-002**: Keep permission records read-only via API (`GET` only) and disallow create/update/delete permission records.
- **REQ-003**: Support role CRUD for custom roles and prevent destructive operations on system roles (`is_system=true`).
- **REQ-004**: Support role-permission assignment/revoke and user-role assignment/revoke with deterministic response codes.
- **REQ-005**: Invalidate affected users permission cache through `PermissionService.invalidate_cache(user)` whenever user-role or role-permission mapping changes.
- **REQ-006**: Ensure endpoint contracts in code match documented planned APIs in `docs/API.md` Section 4.2.
- **SEC-001**: Enforce JWT-based permission checks on all RBAC admin endpoints using `HasJWTPermission` and explicit permission keys.
- **SEC-002**: Keep `auth.authorization_enabled` bypass behavior compatible for development without changing production semantics.
- **API-001**: Standardize endpoint paths to avoid ambiguous dual routes (`@action` auto-path vs custom `re_path`) for the same operation.
- **CON-001**: Follow `AGENT.md` propagation rules; any API contract changes must update `docs/API.md`, `docs/STATUS.md`, and `docs/IMPL_PLAN.md` in the same session.
- **CON-002**: Preserve existing data model contracts in `backend/api/models.py` and avoid schema migration in this task.
- **GUD-001**: Keep implementation deterministic: explicit serializers, explicit error messages, explicit status codes.
- **PAT-001**: Maintain flat permission architecture and bitmap JWT claim model (`permissions` + `pv`) from Slice 2 Task 2.3.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Freeze Task 2.2 RBAC API contract and remove route ambiguity before code refactor.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Reconcile RBAC endpoint contract by comparing `docs/IMPL_PLAN.md` Task 2.2 and `docs/API.md` Section 4.2; select canonical paths: `/api/admin/permissions/`, `/api/admin/roles/`, `/api/admin/roles/{id}/permissions/`, `/api/users/{id}/roles/`. |  |  |
| TASK-002 | Define exact permission keys for each RBAC operation (list/create/update/delete role, assign/revoke role-permission, assign/revoke user-role) and map them to view actions in `backend/api/views.py` (`PermissionViewSet`, `RoleViewSet`, `UserRoleViewSet`). |  |  |
| TASK-003 | Define deterministic API behavior matrix (success/error status codes and response payloads) for all Task 2.2 endpoints and record in `docs/API.md`. |  |  |

### Implementation Phase 2

- GOAL-002: Implement backend code changes to align RBAC endpoints, guards, and cache invalidation behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Create `backend/api/views/rbac.py` and move RBAC viewsets from `backend/api/views.py` into dedicated classes: `PermissionViewSet`, `RoleViewSet`, `UserRoleViewSet` without changing business semantics. |  |  |
| TASK-005 | Create `backend/api/serializers/rbac.py` and move RBAC serializers from `backend/api/serializers.py`: `PermissionSerializer`, `PermissionTreeSerializer`, `RoleSerializer`, `RolePermissionSerializer`, `UserRoleSerializer`, `UserRoleAssignmentSerializer`. |  |  |
| TASK-006 | Update `backend/api/urls.py` to expose only one canonical route per RBAC operation and remove duplicate/legacy route patterns for permission assignment endpoints. | ✅ | 2026-03-31 |
| TASK-007 | Apply `permission_classes` per action using `IsAuthenticated` + `HasJWTPermission('<permission_key>')` for RBAC operations in `backend/api/views/rbac.py`. | ✅ | 2026-03-31 |
| TASK-008 | Ensure `RoleViewSet.assign_permission` and `RoleViewSet.revoke_permission` invalidate cache for all users assigned to the role by iterating role members and calling `PermissionService.invalidate_cache(user)` deterministically. | ✅ | 2026-03-31 |
| TASK-009 | Ensure `UserRoleViewSet.create` and `UserRoleViewSet.destroy` keep current cache invalidation contract and return consistent status codes for idempotent assignment/removal. |  |  |

### Implementation Phase 3

- GOAL-003: Validate behavior and synchronize documentation/status artifacts.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Refactor RBAC tests in `backend/api/tests.py` to only use canonical routes and assert strict codes for all Task 2.2 flows (auth required, admin guard, system role protection, role-permission assignment, user-role assignment). | ✅ | 2026-03-31 |
| TASK-011 | Run backend test subset: `pytest backend/api/tests.py -k "RBAC or roles or permissions"` and resolve failures introduced by Task 2.2 refactor. | ✅ | 2026-03-31 |
| TASK-012 | Update `docs/API.md`, `docs/STATUS.md`, `docs/IMPL_PLAN.md`, and create `docs/reports/YYYY-MM-DD_slice2-task2-2-rbac-api.md` with completion evidence and endpoint contract table. | ✅ | 2026-03-31 |

## 3. Alternatives

- **ALT-001**: Keep RBAC code inside monolithic `backend/api/views.py` and `backend/api/serializers.py`.
Reason not chosen: increases coupling and makes route/guard maintenance error-prone as Slice 2 grows.
- **ALT-002**: Keep both legacy and canonical RBAC routes for backward compatibility.
Reason not chosen: creates ambiguous contracts and duplicate test coverage burden.
- **ALT-003**: Use `IsAuthenticated` only and rely on role grants decoration without explicit `HasJWTPermission` action checks.
Reason not chosen: does not satisfy Task 2.2 API authorization granularity requirement.

## 4. Dependencies

- **DEP-001**: `backend/auth_app/permissions.py` (`HasJWTPermission`, `check_bit_in_bitmap`).
- **DEP-002**: `backend/api/services/permission_service.py` (`invalidate_cache`, bitmap cache lifecycle).
- **DEP-003**: `backend/api/models.py` (`Role`, `Permission`, `RolePermission`, `UserRole`, `UserPermissionCache`).
- **DEP-004**: Existing auth token contract in `backend/auth_app/services/token_service.py` (`permissions`, `pv`).

## 5. Files

- **FILE-001**: `backend/api/views/rbac.py` — dedicated RBAC viewsets and action-level permission guards.
- **FILE-002**: `backend/api/views.py` — remove moved RBAC classes and adjust imports if required.
- **FILE-003**: `backend/api/serializers/rbac.py` — dedicated RBAC serializers.
- **FILE-004**: `backend/api/serializers.py` — remove moved RBAC serializers and keep compatibility imports if required.
- **FILE-005**: `backend/api/urls.py` — canonical RBAC route registration and duplicate route cleanup.
- **FILE-006**: `backend/api/tests.py` — RBAC endpoint contract tests and route assertions.
- **FILE-007**: `docs/API.md` — planned-to-stable RBAC endpoint contract updates.
- **FILE-008**: `docs/STATUS.md` — mark Slice 2 Task 2.2 state transition.
- **FILE-009**: `docs/IMPL_PLAN.md` — mark Task 2.2 completion and align endpoint paths.
- **FILE-010**: `docs/reports/YYYY-MM-DD_slice2-task2-2-rbac-api.md` — session completion report.

## 6. Testing

- **TEST-001**: Unauthenticated request to each RBAC endpoint returns `401`.
- **TEST-002**: Authenticated non-admin/non-authorized request to RBAC endpoints returns `403` when `auth.authorization_enabled=true`.
- **TEST-003**: `GET /api/admin/permissions/` returns read-only list and rejects `POST/PUT/PATCH/DELETE` with `405`.
- **TEST-004**: `DELETE /api/admin/roles/{id}/` rejects system role delete with `403` and deterministic detail message.
- **TEST-005**: Role-permission assign/revoke endpoints update mappings and invalidate cache for affected users.
- **TEST-006**: User-role assign/revoke endpoints update mappings, invalidate target user cache, and return deterministic statuses (`201` create, `200` idempotent create, `204` delete, `404` absent mapping).
- **TEST-007**: Run `python backend/manage.py check` and verify no URL/action resolution errors after route refactor.

## 7. Risks & Assumptions

- **RISK-001**: Route cleanup can break existing tests or external callers using legacy alias paths.
- **RISK-002**: Incorrect permission key mapping can lock out admin RBAC operations.
- **RISK-003**: Bulk cache invalidation for users in large roles can add write overhead.
- **ASSUMPTION-001**: Task 2.1 and 2.3 contracts remain stable (`permission` naming and bitmap claims).
- **ASSUMPTION-002**: No DB schema changes are needed for Task 2.2 completion.
- **ASSUMPTION-003**: Built-in role protection (`is_system`) remains mandatory and unchanged.

## 8. Related Specifications / Further Reading

- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/IMPL_PLAN.md
- docs/API.md
- docs/STATUS.md
- docs/prd/02-authorization.md
- docs/reports/2026-03-30_slice2-task2-1-permission-discovery.md
- docs/reports/2026-03-31_slice2-task2-3-handler-grants-bitmap.md
