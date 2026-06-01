# Session Report: RBAC bitmap authz fix (F38) + i18n + secret reveal

**Date:** 2026-06-01
**Slices / Areas:** Slice 2 (Authorization) — Integration Test Pass 1 follow-up (nhóm B/C + bổ sung)

## Summary

Điều tra các phát hiện manual của Integration Test Pass 1 (nhóm B/C). Phát hiện một **bug RBAC nghiêm trọng** ([B-03]/[B-__]): `HasJWTPermission` đọc claims qua `isinstance(request.auth, dict)`, nhưng `request.auth` là `AccessToken` (SimpleJWT) — không phải dict — nên **nhánh bitmap (production) bị bỏ qua hoàn toàn**, authz âm thầm rơi xuống fallback role-name + `is_superuser`. Hệ quả: mọi permission cấp qua custom role hoặc `system.*` đều vô tác dụng khi `authorization_enabled=true`. Bug ẩn lâu vì toàn bộ test dùng `force_authenticate` (auth=None) → chưa từng chạm nhánh bitmap. Đã sửa theo hướng làm sạch triết lý: **authz thuần bitmap, fail-closed, bỏ fallback + is_superuser**; refactor test fixtures sang JWT thật để bao phủ production path. Kèm sửa bug i18n double-namespace ([_-10]) và bổ sung tính năng reveal secret config ([_-08]).

## Completed Items

- [x] Fix 1 — `HasJWTPermission` bitmap-only, fail-closed, bỏ fallback role-name + `is_superuser` short-circuit
- [x] Fix 2 — Refactor test fixtures (`admin/editor/member_client`) sang JWT thật + gán Role; sửa 4 chỗ `force_authenticate` cục bộ; thêm `test_authz_bitmap.py` (5 regression test); thêm autouse `_clear_caches` chống test pollution
- [x] Fix 3 — `NotificationBell` dùng root translator cho `socketErrorKey` (sửa MISSING_MESSAGE)
- [x] Fix 4 — Reveal secret config: permission `system.config.read_secret` + endpoint `GET /api/admin/config/{key}/reveal/` + serializer context + FE service/hook + MSW handler + cache-gap trong discovery
- [x] Fix 5 — Cập nhật docs: BUGS.md (F38/F39), ARCHITECTURE.md, API.md, plan, memory

## Key Implementations

### RBAC bitmap-only authorization (F38)

1. `HasJWTPermission.has_permission` đọc `request.auth.get('permissions')` (hỗ trợ `AccessToken` + dict) thay vì `isinstance(request.auth, dict)` (luôn False với AccessToken → bitmap rỗng).
2. Xoá hoàn toàn nhánh fallback: không `is_superuser` short-circuit, không role-name DB check. Authz = chỉ bitmap.
3. Fail-closed: no token / no bitmap / unknown permission / decode error → deny. Dev-bypass (`authorization_enabled=false`) vẫn allow authenticated.
4. Thêm `__call__` trả `self` để dùng được `HasJWTPermission('key')` instance trong `permission_classes` (cho action reveal).

### Test fixtures sang JWT thật (F38)

1. `admin/editor/member_user` gán built-in Role tương ứng (Admin/Editor/Member) — vì bitmap lấy quyền từ Role trong DB.
2. `admin/editor/member_client` phát JWT thật qua `TokenService.issue_tokens_for_new_session` + `client.credentials('Bearer …')` thay vì `force_authenticate`. Giữ nguyên tên fixture → 23 file test không phải đổi.
3. `_clear_caches` autouse fixture clear Django cache mỗi test → chống pollution qua `get_config` cache (đã gây order-dependent failures pre-existing).
4. `test_authz_bitmap.py`: custom-role-with-permission → 200 (case [B-03]); thiếu perm → 403; superuser-no-role → 403; built-in Admin → 200; unauthenticated → 401/403.

### Reveal secret config (F4 / _-08)

1. Permission `system.config.read_secret` (code-registry, Admin by default).
2. `SystemConfigSerializer.to_representation` mask SECRET trừ khi context `reveal_secrets=True`.
3. Action `reveal` (detail GET) trên `SystemConfigViewSet` với `permission_classes=[IsAuthenticated, HasJWTPermission(PERM_CONFIG_READ_SECRET)]` → serialize với context reveal.
4. `discover_permissions()` clear `UserPermissionCache` khi permission set/link đổi → permission mới hiệu lực sau server boot mà không cần invalidate thủ công.

### NotificationBell i18n (F39 / _-10)

1. `useNotificationSocket` đặt `errorKey` = full path từ root (`notifications.errors.authRequired`).
2. `NotificationBell` trước dùng `t(socketErrorKey)` với `t=useTranslations('notifications')` → double prefix. Sửa: thêm `tRoot=useTranslations()` và resolve bằng `tRoot(...)`.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/permissions.py` | Bitmap-only authz, bỏ fallback + is_superuser, đọc `request.auth.get(...)`, thêm `__call__` |
| `backend/tests/fixtures/auth.py` | Fixtures phát JWT thật + gán Role; helpers `_assign_role`/`_authenticated_client` |
| `backend/conftest.py` | Autouse `_clear_caches` chống test pollution |
| `backend/auth_app/tests/test_authz_bitmap.py` | (mới) 5 regression test nhánh bitmap với JWT thật |
| `backend/api/tests/test_learn_{course,lesson}_api.py` | Bỏ `force_authenticate` cục bộ → `_jwt_client`; sửa kỳ vọng status-filter |
| `backend/api/tests/test_quiz_api.py` | Sửa kỳ vọng member status=draft → 0; thêm test default-list |
| `backend/api/tests/test_rbac_api.py` | `UserRole.create` → `get_or_create` (fixture đã gán role) |
| `backend/api/tests/test_system_config_api.py` | 2 test reveal (admin 200, non-admin 403) |
| `backend/auth_app/{constants,permissions_registry}.py` | Permission `system.config.read_secret` |
| `backend/api/views/system_config.py`, `backend/api/serializers/system.py` | Action reveal + mask-by-context |
| `backend/auth_app/services/permission_discovery.py` | Clear UserPermissionCache khi permission set đổi |
| `frontend/src/components/features/notifications/NotificationBell.tsx` | Root translator cho socketErrorKey |
| `frontend/src/services/system-config.service.ts`, `frontend/src/hooks/useSystemConfig.ts` | `revealSystemConfigSecret` + gọi đúng endpoint reveal |
| `frontend/src/mocks/handlers/system-config.handlers.ts` | Handler reveal + retrieve luôn mask |
| `docs/{BUGS,ARCHITECTURE,API}.md`, `plan/integration-test-1.md` | Đồng bộ cơ chế + ghi nhận kết quả |

## Notes / Caveats

- **Triết lý mới (breaking cho test):** `force_authenticate` không còn dùng được cho endpoint có permission (auth=None → bitmap rỗng → deny). Test mới hit protected endpoint **phải** dùng JWT thật.
- **Deploy note:** sau khi thêm permission mới vào registry, server boot (`discover_permissions`) tự clear cache; user login sau đó nhận quyền mới. Token đang sống vẫn dùng bitmap cũ tới khi refresh (chấp nhận được — không ép logout).
- **Pre-existing failures đã sửa:** `test_member_status_filter_cannot_expose_draft` (course + quiz) vốn fail trên HEAD gốc do kỳ vọng sai; đã chỉnh cho khớp hành vi đúng (member xin status không được phép → trả rỗng, an toàn hơn).
- **FE typecheck:** còn 1 lỗi TS pre-existing ở `AdminChallengeCreatePageClient.tsx` — ngoài phạm vi session này (file không bị chạm).
- **Pre-existing test fail (ngoài scope):** `realtime/tests/test_notification_consumer.py::test_notification_ws_broadcast_fanout_to_active_connections` fail với `NotificationService.broadcast_notification() missing keyword 'actor'` — fail cả trên HEAD gốc; là drift signature service↔test trong notification, không liên quan authz/i18n/secret. Cần fix riêng.
- **Chưa chạy full suite trong session** (mất nhiều phút). Đã chạy ~190+ test qua các module then chốt — tất cả pass. User đang chạy full suite song song trên PowerShell.
