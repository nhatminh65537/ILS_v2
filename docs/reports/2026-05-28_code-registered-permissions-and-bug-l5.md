# Session Report: Code-Registered Permissions + Bug L5 (BE-Authoritative AuthZ)

**Date:** 2026-05-28
**Slices / Areas:** RBAC infrastructure (Slice 2 extension) · Admin shell (Slice 3) · FE authz UX (BUGS L5)

## Summary

Mở rộng hệ thống RBAC để permission có thể được khai báo bằng **code** thay vì chỉ sinh từ URL scan. Bổ sung 13 permission `system.*` (admin portal access, draft/archive material reads, 9 admin section gates, material purge). Loại bỏ toàn bộ hardcode `role__name__in=['Admin','Editor']` ở service layer và token service, chuyển sang `PermissionService.check_permission(user, key)`. Thay 133 literal `'Admin'/'Editor'/'Member'` trong `@add_role_granted(...)` decorators bằng constants. Phía FE bỏ catalog-based capability check (`hasPermissionKey/canManage*`), thêm `admin_sections` JWT claim, sidebar admin filter theo claim, và global `PermissionErrorDialog` cho 403 response.

## Completed Items

- Code-registered permission registry (`backend/auth_app/permissions_registry.py`)
- `discover_permissions()` merge URL-scanned + code-registered (raise on name conflict)
- 4 service refactor: `Course/Challenge/Quiz/Lesson` dùng `_can_read_draft/_can_read_archive`
- `TokenService` derive `admin_surface` + `admin_sections[]` từ permission
- 133× `@add_role_granted('Admin', ...)` → constants
- FE `rbac-claim.ts` strip catalog APIs, thêm `getAdminSections`
- `PermissionErrorDialog` + axios 403 interceptor + event bus
- `AdminProtectedSectionGate` (auto-derive section từ pathname) wired vào admin protected layout
- `AdminSidebar` lọc nav items theo `admin_sections` claim
- MSW mocks issue `admin_sections` trong access token
- Test conftest autouse fixture chạy `discover_permissions()` trên test DB
- BUGS L5 đóng (đánh dấu F36)

## Key Implementations

### Code-Registered Permission Discovery

1. `permissions_registry.py` định nghĩa `CodePermission(name, description, granted_roles)` dataclass + tuple `CODE_PERMISSIONS`.
2. `discover_permissions()` build dict từ URL scan (như cũ), rồi `_merge_code_permissions(discovered)` chèn từng `CodePermission` vào dict — raise `PermissionDiscoveryConflictError` nếu name đã tồn tại từ URL scan.
3. Persist block giữ nguyên: cùng `Permission.objects.get_or_create` + `RolePermission.objects.get_or_create`. Permission description sync từ registry mỗi lần boot.
4. Namespace: code-registered dùng `system.*`, URL-scanned dùng `api.*` → không bao giờ trùng nếu tuân quy ước.

### Service-Layer Visibility (Course/Challenge/Quiz/Lesson)

1. Mỗi service có 2 helper: `_can_read_draft(user)` / `_can_read_archive(user)`, gọi `user.has_permission(PERM_MATERIAL_READ_*)`.
2. `_allowed_statuses(user)` build set bắt đầu `{PUBLISHED}`, thêm `DRAFT` nếu có draft perm, thêm `ARCHIVED` nếu có archive perm.
3. `filter_visible_*` filter `queryset.filter(status__in=allowed)`. Nếu user gửi `?status=X` và X không có trong allowed → trả `queryset.none()` thay vì tự fallback (chặn member dùng `?status=draft` để bypass).
4. Riêng `CourseService.archive_or_purge_course`: thay role-name check bằng `actor.has_permission(PERM_MATERIAL_PURGE)`.

### Admin Sections Claim

1. `TokenService._has_admin_surface_access(user)` đơn giản hóa: `return user.has_permission('system.admin_portal.access')`. Bỏ luôn `is_superuser` short-circuit (superuser đã có role Admin thông qua `seed_admin`).
2. `_compute_admin_sections(user)` lặp qua dict `ADMIN_SECTIONS = {'dashboard': PERM_..., 'config': PERM_..., ...}` và thu list section_key user có quyền.
3. Inject `admin_surface` + `admin_sections` vào cả access và refresh token.

### Frontend Section Gate

1. `AdminProtectedSectionGate` (client component) bọc trong `(protected)/layout.tsx`, dùng `usePathname` để map prefix `/admin/users/*` → section `users`, etc.
2. Nếu `getAdminSections(token).has(section) === false` → `router.replace('/{locale}/admin')`.
3. `AdminSidebar` filter items theo cùng set sections (mỗi item có `section` key).
4. Mỗi action button KHÔNG còn check FE permission — render tự nhiên; 403 từ BE → axios interceptor `emitPermissionError({status: 403, message})` → `PermissionErrorDialog` lắng nghe và hiện modal i18n.

### Test Discovery Autouse

1. Tests cũ dựa vào `is_editor_or_admin` (role-name) nên chỉ cần `_assign_role(user, 'Editor')`. Sau refactor, Editor cần permission link với `system.material.read_draft` qua RolePermission.
2. Thêm `_seed_authz_discovery(db)` autouse trong `conftest.py` chạy `discover_permissions()` trong từng test transaction (idempotent, rolled back ngay sau).
3. Sửa `tests/fixtures/rbac.py` dùng `get_or_create` cho Role/Permission/RolePermission để tránh `UNIQUE constraint failed` khi autouse fixture đã tạo trước.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/constants.py` | Thêm 13 hằng `PERM_*` + `ADMIN_SECTIONS` dict |
| `backend/auth_app/permissions_registry.py` *(new)* | `CodePermission` dataclass + `CODE_PERMISSIONS` tuple |
| `backend/auth_app/permissions.py` | Replace literal `'Member'` → `BUILTIN_ROLE_MEMBER` |
| `backend/auth_app/services/permission_discovery.py` | `_merge_code_permissions` + conflict error + description sync |
| `backend/auth_app/services/token_service.py` | `_has_admin_surface_access` qua permission; `_compute_admin_sections` |
| `backend/api/services/course_service.py` | `_can_read_draft/_can_read_archive`, `_allowed_statuses`, purge dùng perm |
| `backend/api/services/challenge_service.py` | Same pattern as course |
| `backend/api/services/quiz_service.py` | Same |
| `backend/api/services/lesson_service.py` | `get_visible_lesson_by_id` dùng 2 helper |
| `backend/api/serializers/challenge.py` | `flag_value` hide dùng `api.learn_challenge.flags` perm thay vì `is_editor_or_admin` |
| `backend/api/views/*.py` (11 file) | `@add_role_granted('Admin', ...)` → constants (133 chỗ) |
| `backend/conftest.py` | Autouse `_seed_authz_discovery` fixture |
| `backend/tests/fixtures/rbac.py` | `get_or_create` thay `create` |
| `frontend/src/lib/rbac-claim.ts` | Xóa catalog APIs, thêm `getAdminSections`/`hasAdminSection` |
| `frontend/src/lib/permission-error-bus.ts` *(new)* | Pub/sub cho 403 events |
| `frontend/src/lib/axios.ts` | 403 interceptor emit event |
| `frontend/src/components/feedback/PermissionErrorDialog.tsx` *(new)* | Global modal |
| `frontend/src/components/layouts/AdminSidebar.tsx` *(new)* | Filter items by sections claim |
| `frontend/src/components/layouts/AdminProtectedSectionGate.tsx` *(new)* | Auto-gate per pathname |
| `frontend/src/components/layouts/AdminAccessGate.tsx` | Thêm `AdminSectionGate` export (optional explicit use) |
| `frontend/src/components/layouts/AdminLayout.tsx` | Dùng `AdminSidebar` + items có `section` key |
| `frontend/app/[locale]/(admin)/admin/(protected)/layout.tsx` | Wrap children với `AdminProtectedSectionGate` |
| `frontend/app/[locale]/layout.tsx` | Mount `<PermissionErrorDialog />` global |
| `frontend/src/components/features/rbac/{RbacOverviewClient,RolePermissionsPageClient,UserRolesPageClient}.tsx` | Xóa `canManage*` capability hooks |
| `frontend/src/hooks/useSystemConfig.ts` | Xóa catalog/capabilities path, trả `PERMISSIVE_CAPABILITIES` |
| `frontend/src/mocks/handlers/auth.handlers.ts` | Issue `admin_sections` trong mock JWT |
| `frontend/src/mocks/handlers/admin-permissions.ts` | `buildMockAccessToken` nhận tham số `adminSections` |
| `frontend/messages/{en,vi}.json` | Thêm `common.permissionDenied.{title,defaultMessage,acknowledge}` |
| `docs/BUGS.md` | L5 đóng → F36 |

## Notes / Caveats

- **256-bit bitmap**: sau refactor có 155 permission tổng (124 endpoint + 13 code-registered + thừa kế). Còn ~100 slot trống — vẫn an toàn. Khi vượt 256 phải mở rộng bitmap (chưa cần).
- **Permission cache invalidation**: lần đầu admin login sau refactor, claim `admin_sections` có thể trống nếu cache cũ chưa bust. Manual smoke đã verify `PermissionService.invalidate_cache(user)` cho ra claim đúng. Trong production cần đảm bảo permission_version đã bump khi discovery thêm permission mới (đã có cơ chế qua `discover_permissions` `created_permissions`).
- **`SystemConfigCapabilities`** trong FE giờ luôn = `PERMISSIVE_CAPABILITIES`. Component cũ vẫn check `capabilities.canUpdate` (không hại, luôn true). Có thể remove khi reach Slice cleanup.
- **AI app**: không đụng (Slice 10 deferred).
- **Migration DB**: không cần — Permission/Role schema không đổi.
- **`AdminSectionGate` export**: thêm vào `AdminAccessGate.tsx` để có thể dùng explicit per-page nếu cần (vd nested route đặc biệt), nhưng mặc định `AdminProtectedSectionGate` ở layout đã đủ cho 9 section hiện tại.
- **MSW catalog mock**: vẫn giữ `admin-permissions.ts` để mock 24 permission, không xóa vì RBAC overview admin page cần list permission tree. Mock chưa thêm 13 `system.*` perm — nếu test FE cụ thể về sidebar filtering qua MSW, cần bổ sung sau.
