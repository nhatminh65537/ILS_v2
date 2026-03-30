# Session Report: Slice 2 Task 2.1 Permission Auto-Discovery

**Date:** 2026-03-30
**Slices / Areas:** Slice 2 - Authorization / RBAC (Task 2.1)

## Summary

Implemented startup permission auto-discovery and built-in role sync for RBAC foundations. The backend now scans decorated class-based endpoints, generates lowercase permission names using the finalized format, upserts role-permission mappings idempotently, and marks stale permissions inactive. Startup safety guards were added to avoid execution in test/migration/check commands, and discovery behavior is covered by backend tests.

## Completed Items

- [done] Added decorator metadata utility for built-in role grants in auth app.
- [done] Implemented permission discovery service with URL traversal and normalized naming.
- [done] Integrated discovery into `AuthAppConfig.ready()` with strict/disable flags and command guards.
- [done] Annotated API viewsets with `@add_role_granted(...)` metadata for discovery inputs.
- [done] Added tests for naming, idempotency, stale permission inactivation, and role-permission sync.
- [done] Updated documentation for naming format and implementation status consistency.

## Key Implementations

### Startup Permission Discovery

1. Traverse all resolved URL patterns recursively and inspect class-based callbacks only.
2. Skip non-decorated endpoints and derive route handler names from DRF action mapping or APIView methods.
3. Normalize permission names as `{app_label}.{resource_name}.{handler_method_name}` in lowercase.
4. Set all existing permissions inactive, then upsert discovered permissions as active.
5. Upsert built-in roles from decorator metadata and link role-permission rows idempotently.

### Naming Normalization

1. Compute `resource_name` from class name by removing `ViewSet`/`View`/`APIView`/`GenericViewSet`.
2. Convert the remaining class token to snake_case lowercase.
3. For ViewSet routes use action names like `list`, `retrieve`, `submit_flag`, `tree`.
4. For APIView routes use method names like `get`, `post`, `patch`.

### Startup Guarding

1. Prevent duplicate runs in a single process with a module-level guard.
2. Support operational flags: `AUTHZ_DISCOVERY_DISABLED` and `AUTHZ_DISCOVERY_STRICT`.
3. Skip discovery for command contexts where DB access during app init is undesirable (`pytest`, `test`, `migrate`, `makemigrations`, `collectstatic`, `check`).

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/permissions.py` | Added `add_role_granted` decorator and metadata constant |
| `backend/auth_app/services/permission_discovery.py` | Added discovery/sync engine and naming normalization helpers |
| `backend/auth_app/apps.py` | Added startup integration, execution guards, and strict error behavior |
| `backend/api/views.py` | Added `@add_role_granted` annotations to API viewsets |
| `backend/api/models.py` | Updated `Permission` model docstring naming format |
| `backend/auth_app/tests.py` | Added discovery test coverage (naming/idempotency/inactive/role mapping) |
| `docs/REQUIREMENTS.md` | Updated permission naming rule to new normalized format |
| `docs/DECISIONS.md` | Updated R-AUTH-05 naming decision details |
| `docs/ARCHITECTURE.md` | Updated auto-discovery naming contract |
| `docs/DATA_MODEL.md` | Updated permission naming business rule |
| `docs/prd/02-authorization.md` | Updated FR/AC/examples for naming and decorator usage |
| `docs/IMPL_PLAN.md` | Updated Task 2.1 algorithm examples and key convention |
| `docs/API.md` | Added active authorization bootstrap behavior notes |
| `docs/STATUS.md` | Marked Slice 2 Task 2.1 completed and removed pending entry |
| `openmemory.md` | Added Slice 2.1 status and naming pattern memory |

## Notes / Caveats

- Discovery currently depends on `@add_role_granted(...)` metadata attached to class-based endpoints.
- Permission endpoint CRUD remains out of scope for this task and is still planned under Task 2.2.
- Pytest emits one pre-existing warning: unknown config option `asyncio_mode`.
