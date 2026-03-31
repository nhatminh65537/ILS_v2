# Session Report: Slice 2 Task 2.3 + Endpoint Handler Role Grants

**Date:** 2026-03-31
**Slices / Areas:** Slice 2 - Authorization / RBAC (Task 2.3 + handler-level grant implementation)

## Summary

Implemented the remaining RBAC phases after Phase 1 planning: endpoint-level role grants are now supported explicitly on handlers (with handler precedence over class defaults), permission discovery resolves those grants deterministically, permission cache is now a base64 bitmap in `user_permission_cache`, and JWT tokens now include `permissions` bitmap plus `pv` claim. Auth/RBAC tests were updated and verified passing.

## Completed Items

- [done] Extended `@add_role_granted(...)` to work on both classes and handler methods.
- [done] Implemented discovery precedence: handler-level grant overrides class-level grant.
- [done] Added explicit handler-level grants in `CourseViewSet` for custom action (`tree`) and default mixin action (`create` via override + `super()`).
- [done] Refactored permission computation to flat permission IDs with deny-only override and active-only filter.
- [done] Switched permission cache format from JSON permission names to base64 bitmap.
- [done] Wired `TokenService` to live permission cache and changed JWT version claim key to `pv`.
- [done] Updated invalidation in user-role assignment APIs to use centralized `PermissionService.invalidate_cache()`.
- [done] Updated and passed auth/RBAC tests (`backend/auth_app/tests.py`).
- [done] Synchronized STATUS/API/plan documents to reflect completed implementation.

## Key Implementations

### Handler-Level Role Grant Resolution

1. `@add_role_granted` stores role metadata on either view class or handler method.
2. Discovery collects route handlers from DRF action maps (`callback.actions`).
3. For each handler, discovery resolves effective roles by precedence: handler metadata first, then class metadata.
4. Discovery upserts permission records and role-permission links idempotently.

### Default Mixin Handler Specific Roles (Override + Super)

1. For a default mixin action requiring different roles, explicitly override the handler method.
2. Attach `@add_role_granted(...)` directly to the overridden method.
3. Delegate implementation to `super().<method>(...)` to preserve DRF behavior.
4. Discovery reads this handler-level metadata and applies endpoint-specific role mapping.

### Permission Cache Bitmap Pipeline

1. Compute effective permission IDs from role grants (`RolePermission`) for user roles.
2. Remove deny-only overrides from `UserPermission`.
3. Encode resulting permission IDs into fixed-size 256-bit bitmap (32 bytes), base64 string.
4. Store and reuse bitmap via `UserPermissionCache` when `permission_version` matches.
5. Recompute and refresh cache when version mismatches.

### JWT Claim Emission

1. `TokenService.issue_tokens` requests encoded bitmap from `PermissionService.get_or_refresh_cache`.
2. Injects `permissions` bitmap and `pv` claim into refresh and access tokens.
3. Refresh flow preserves rate limit and session rotation behavior.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/permissions.py` | Added handler-level metadata support for `@add_role_granted`; added metadata reader helper; removed dead return path. |
| `backend/auth_app/services/permission_discovery.py` | Added handler-level vs class-level role resolution precedence and per-handler role evaluation. |
| `backend/api/views.py` | Added explicit handler role grants (`CourseViewSet.create`, `CourseViewSet.tree`); switched user-role cache invalidation to service method. |
| `backend/api/services/permission_service.py` | Replaced JSON-name cache logic with flat ID computation + bitmap encoding + cache lifecycle + permission bitmap checks. |
| `backend/auth_app/services/token_service.py` | Replaced permission cache stub with service call; changed JWT version claim to `pv`. |
| `backend/auth_app/tests.py` | Updated token claim assertions to `pv` + bitmap validation; added discovery assertions for handler-level override precedence. |
| `docs/STATUS.md` | Marked Slice 2 Task 2.3 + handler grants completed; removed in-progress marker; updated pending Slice 2 tasks. |
| `docs/API.md` | Added active auth claim contract note (`permissions` bitmap + `pv`). |
| `plan/feature-rbac-handler-grants-1.md` | Marked implementation plan status and phase 2 tasks completed. |

## Notes / Caveats

- Permission bitmap currently enforces index range `0..255`; permission IDs outside this range raise error during encoding.
- Existing decision `Q-ARCH-01` is documented as resolved to 256-bit bitmap and this implementation follows that contract.
- Role/Permission CRUD API (Task 2.2) and frontend RBAC UI (Task 2.4) remain pending in Slice 2.
