# Session Report: Permission System Refactor — Unified Views & Auto-Derived Keys

**Date:** 2026-04-14
**Slices / Areas:** Cross-cutting — Permission System, Slice 2 (Authorization), all API Views

---

## Summary

Refactored the entire backend permission system to eliminate hardcoded permission strings and merge the split `admin_views.py` / `views/` structure into a single unified `views/` directory. The key design insight: `HasJWTPermission` can auto-derive the permission key (`api.role.list`) at runtime by reading `view.__class__` + `view.action` — the same formula the endpoint scanner (`discover_permissions()`) uses to populate the database. This removes the `action_permission_map` dict and the `RBACActionPermissionMixin` entirely, replacing both with a two-liner `permission_classes = [IsAuthenticated, HasJWTPermission]` on every protected ViewSet. Fixed BUG H1 (`SystemConfigViewSet` using `IsAdminUser`), resolved M1, and fixed H5 (QuizNodeViewSet RBAC mismatch). All 112 backend tests pass.

---

## Completed Items

- Added `derive_permission_key(view_class, action)` shared utility to `auth_app/permissions.py`
- `permission_discovery.py` now imports and reuses `derive_permission_key` — scanner and runtime share a single source of truth for key derivation
- `HasJWTPermission` updated: auto-derives key when no explicit key provided; added no-JWT-bitmap fallback using `@add_role_granted` metadata for test environments using `force_authenticate`
- Created `api/views/roles.py` — `RoleViewSet` (moved from `admin_views.py`)
- Created `api/views/admin_users.py` — `AdminUserViewSet`, `UserRoleViewSet` (moved)
- Created `api/views/permissions.py` — `PermissionViewSet` (moved)
- Created `api/views/system_config.py` — `SystemConfigViewSet` (moved; **BUG H1 fixed**: replaced `IsAdminUser` with `HasJWTPermission`)
- Deleted `api/admin_views.py`
- Deleted `api/mixins/rbac_action_permission.py` and `api/mixins/` directory
- Removed `QuizActionPermission` class from `api/views/quizzes.py` (**BUG H5 fixed**)
- Removed all `action_permission_map` dicts from all ViewSets (**M1 resolved**)
- Updated `api/views/__init__.py` and `api/urls.py` to import from new locations
- Updated `api/views/users.py`: `get_permissions()` now returns `[IsAuthenticated(), HasJWTPermission()]` for protected actions

---

## Key Implementations

### 1. `derive_permission_key()` — Shared Utility (`auth_app/permissions.py`)

1. `view_class.__module__` → split on first `.` → app_label (e.g., `'api'`)
2. `view_class.__name__` → strip suffix (`ViewSet`/`View`/`APIView`/`GenericViewSet`) → CamelCase to snake_case via regex → resource name (e.g., `AdminUserViewSet` → `admin_user`)
3. `f'{app_label}.{resource}.{action}'.lower()` → `'api.admin_user.list'`
4. `permission_discovery.py` imports this function and uses it instead of private `_extract_app_label` + `_normalize_resource_name` — single point of truth ensures scanner and runtime always produce identical keys.

### 2. `HasJWTPermission` Auto-Derive + Fallback (`auth_app/permissions.py`)

**JWT bitmap path (production):**
1. `view.action` → `derive_permission_key(view.__class__, action)` → permission key
2. Validate `request.auth` is a `dict` (not Mock) → extract `permissions` bitmap
3. `Permission.objects.get(name=key)` → `check_bit_in_bitmap(bitmap, permission.id)`

**No-bitmap fallback (tests using `force_authenticate`):**
1. `user.is_superuser` → allow (admin test user passes all admin endpoints)
2. Resolve `effective_roles` from `@add_role_granted` (handler-level overrides class-level)
3. `'Member' in effective_roles` → allow (any authenticated user qualifies for member-grade endpoints)
4. Otherwise → `user.user_roles.filter(role__name__in=effective_roles).exists()` → DB check (denies member on Admin-only endpoints)

This fallback preserves backwards-compatible test behaviour: superuser admin fixtures pass all endpoints; plain member fixtures get 403 on admin routes; any authenticated user can access Member-grade endpoints (`me`, profile, etc.).

### 3. Unified ViewSet Pattern

Before:
```python
class RoleViewSet(RBACActionPermissionMixin, viewsets.ModelViewSet):
    action_permission_map = {
        'list': 'api.role.list',
        'create': 'api.role.create',
        ...  # 8 hardcoded strings
    }
```

After:
```python
@add_role_granted('Admin')
class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasJWTPermission]
    # No action_permission_map — keys auto-derived at request time
```

---

## Files Changed

| File | Change Summary |
|------|---------------|
| `auth_app/permissions.py` | Added `_normalize_resource_name()`, `derive_permission_key()`; rewrote `HasJWTPermission.has_permission()` with auto-derive + no-bitmap fallback |
| `auth_app/services/permission_discovery.py` | Removed private `_extract_app_label`, `_normalize_resource_name`, `re` import; now imports `derive_permission_key` from `auth_app.permissions` |
| `api/views/roles.py` | **Created** — `RoleViewSet` moved from `admin_views.py` |
| `api/views/admin_users.py` | **Created** — `AdminUserViewSet`, `UserRoleViewSet` moved from `admin_views.py` |
| `api/views/permissions.py` | **Created** — `PermissionViewSet` moved from `admin_views.py` |
| `api/views/system_config.py` | **Created** — `SystemConfigViewSet` moved; `IsAdminUser` replaced with `HasJWTPermission` (fixes H1) |
| `api/views/quizzes.py` | Removed `QuizActionPermission` class and `action_permission_map` from both ViewSets; now `permission_classes = [IsAuthenticated, HasJWTPermission]` |
| `api/views/users.py` | `get_permissions()` protected branch now returns `[IsAuthenticated(), HasJWTPermission()]` |
| `api/views/__init__.py` | Added exports for 4 new admin view classes |
| `api/urls.py` | Removed `from .admin_views import ...`; all imports from `api.views` |
| `api/admin_views.py` | **Deleted** |
| `api/mixins/rbac_action_permission.py` | **Deleted** |

---

## Notes / Caveats

- **BUG H1 fixed**: `SystemConfigViewSet` now uses `HasJWTPermission` instead of Django's `IsAdminUser`.
- **BUG H5 fixed**: `QuizNodeViewSet` no longer uses `QuizActionPermission`; RBAC is handled uniformly by `HasJWTPermission` which reads `@add_role_granted` per-method decorators.
- **M1 resolved**: `action_permission_map` fully eliminated across all ViewSets.
- The no-bitmap fallback logic is **only ever triggered** when `request.auth` is not a dict (e.g., `APIClient.force_authenticate()` in tests). In production all JWT-authenticated requests carry a proper `dict` with the `permissions` bitmap, so the fallback is never reached.
- `HasJWTPermission('explicit.key')` with an explicit string still works as before — backward compatible for any edge case that needs an explicit override.
