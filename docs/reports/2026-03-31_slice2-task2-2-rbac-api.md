# Session Report: Slice 2 Task 2.2 RBAC Role/Permission CRUD API

**Date:** 2026-03-31
**Slices / Areas:** Slice 2 - Authorization / RBAC (Task 2.2)

## Summary

Completed Slice 2 Task 2.2 by stabilizing RBAC CRUD endpoint contracts, enforcing admin-only access for RBAC management APIs, wiring action-level JWT permission-key checks for JWT-authenticated requests, and ensuring permission-cache invalidation on role/permission mutation paths. Route contract ambiguity was removed by standardizing assignment APIs on canonical `/permissions/` paths, and RBAC test coverage was updated and validated.

## Completed Items

- [done] Canonicalized role-permission assignment route to `POST /api/admin/roles/{id}/permissions/`.
- [done] Removed duplicate custom role-permission URL mappings in API URL config.
- [done] Unified role permission list/assign behavior under one action endpoint (`GET/POST .../permissions/`).
- [done] Enforced admin-only guard (`IsAuthenticated + IsAdminUser`) on RBAC management viewsets.
- [done] Added action-level JWT permission-key checks for RBAC actions when JWT auth context is present.
- [done] Updated role-permission mutation flow to invalidate caches for all users assigned to the mutated role using `PermissionService.invalidate_cache`.
- [done] Added regression test verifying role-permission assignment invalidates assigned-user cache and increments `permission_version`.
- [done] Updated STATUS/IMPL_PLAN/API docs to align with active Task 2.2 behavior.

## Key Implementations

### Canonical RBAC Route Contract

1. Removed duplicate custom URL entries for role-permission routes in `backend/api/urls.py`.
2. Kept canonical operations through routed actions:
   - `GET/POST /api/admin/roles/{id}/permissions/`
   - `DELETE /api/admin/roles/{id}/permissions/{perm_id}/`
3. Updated tests to use canonical route path and removed dependency on alias route patterns.

### RBAC Access Guard Hardening

1. Applied admin-only authorization to RBAC viewsets (`PermissionViewSet`, `RoleViewSet`, `UserRoleViewSet`).
2. Added per-action permission-key maps.
3. Added action-level `HasJWTPermission('<permission_key>')` checks when JWT auth context exists on request.

### Deterministic Cache Invalidation on Role Mutation

1. On role-permission assign/revoke, enumerate users assigned to the role.
2. Call `PermissionService.invalidate_cache(user)` for each affected user.
3. Ensure `permission_version` increments and stale `UserPermissionCache` rows are deleted.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/urls.py` | Removed duplicate custom role-permission routes; kept canonical routed endpoints. |
| `backend/api/views.py` | Hardened RBAC guards, unified permissions action (`GET/POST`), wired action-level JWT checks, and switched role-user cache invalidation flow to `PermissionService`. |
| `backend/api/tests.py` | Updated canonical route path usage, added non-admin-forbidden coverage, added cache-invalidation regression test. |
| `docs/API.md` | Added active RBAC endpoint section and notes for canonical route + JWT/action guard behavior. |
| `docs/IMPL_PLAN.md` | Marked Task 2.2 completed and aligned file references with current implementation layout. |
| `docs/STATUS.md` | Marked Slice 2 Task 2.2 completed and removed in-progress entry. |
| `plan/feature-rbac-task2-2-role-permission-api-1.md` | Updated plan status/progress markers during execution. |

## Verification

- Command: `python manage.py check`
  - Result: no issues (`System check identified no issues`).
- Command: `pytest api/tests.py -k "RBAC"`
  - Result: `16 passed, 9 deselected`.

## Notes / Caveats

- RBAC permission-key checks are action-wired and evaluated when JWT auth context is present.
- Current implementation remains in `backend/api/views.py` and `backend/api/serializers.py`; module split into dedicated `rbac.py` files can be treated as an optional cleanup/refactor task.
