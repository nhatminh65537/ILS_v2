# BUGS.md — ILS v2 Known Bugs & Issues

> Track all known bugs here. Update when fixing or discovering new issues.
> Format: one table per severity level. Move bugs to **Fixed** section after resolving.

---

## Active Bugs

### High — Breaks functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| H1 | `api/admin_views.py` | `AdminUserViewSet`, `PermissionViewSet`, `RoleViewSet`, `UserRoleViewSet` dùng `permission_classes = [IsAuthenticated, IsAdminUser]` — `IsAdminUser` kiểm tra `is_staff=True` (Django built-in), vi phạm ARCHITECTURE.md §7 "Never use Django built-in permission system". User có role "Admin" nhưng `is_staff=False` bị block. `SystemConfigViewSet` không có `RBACActionPermissionMixin` nên `@add_role_granted('Admin')` chỉ tạo DB entry nhưng không enforce runtime. Partial fix (2026-04-13): mixin default đổi thành `(IsAuthenticated,)` cho các viewsets có mixin; `SystemConfigViewSet` vẫn cần full fix. | Áp dụng hướng sửa ở M1 cho toàn bộ admin viewsets, bao gồm `SystemConfigViewSet`. |
| H3 | `frontend/src/components/layouts/AdminAccessGate.tsx` + admin routes `frontend/app/[locale]/(admin)/admin/(protected)/*` | **Admin route authorization bypass ở frontend:** user đã đăng nhập nhưng không có quyền admin (ví dụ `member3`) vẫn truy cập được `/vi/admin/users` trong phiên test Slice 8 (F-1-5 fail). Hiện guard chỉ kiểm tra authenticated, không kiểm tra role/permission claim. Khi backend chạy với authz bypass hoặc kiểm tra chưa chặt sẽ thành lỗ hổng truy cập bề mặt quản trị. | Bổ sung authorization gate cho admin surface dựa trên claims/permission đã chuẩn hóa (không dùng Django built-in). Giữ route-level deny rõ ràng (redirect admin login hoặc 403) cho non-admin. |

### Medium — Degrades functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| M1 | `api/mixins/rbac_action_permission.py` + `api/admin_views.py` | **Design bug: `action_permission_map` và `HasJWTPermission` hardcode tên permission dạng string** (ví dụ `'api.admin_user.list'`). Vấn đề: (1) `discover_permissions()` tại startup tự derive tên từ class name + handler name — cùng công thức nhưng hai nơi phải đồng bộ bằng tay; (2) Nếu rename ViewSet hay handler, tất cả string trong `action_permission_map` phải sửa theo, dễ mismatch và silent failure; (3) `@action(permission_classes=[HasJWTPermission('api.role.list')])` trong decorator cũng là hardcode tương tự. **Fix đúng:** `RBACActionPermissionMixin.get_permissions()` nên tự derive permission name theo cùng công thức với `discover_permissions()` — `{app_label}.{normalize(ClassName)}.{action}` — thay vì lookup `action_permission_map`. Khi đó `action_permission_map` chỉ dùng để override ngoại lệ. Đây cũng giải quyết hoàn toàn H1 cho mọi viewset kể cả không có mixin. | Implement auto-derive trong mixin: extract `_normalize_resource_name` và `_extract_app_label` từ `permission_discovery.py` thành shared utility, gọi trong `get_permissions()` để derive tên tự động. |
| M3 | `frontend/src/components/features/quizzes/*` + `frontend/src/mocks/handlers/quizzes.handlers.ts` | **Cross-surface inconsistency khi test bằng MSW**: thao tác create/update/delete quiz ở admin không phản ánh nhất quán ở user catalog trong cùng phiên test. Retest 2026-04-14 ghi nhận H-1/H-2/H-3 fail. **Ghi chú:** hiện coi là bug liên quan môi trường mock/state sharing, chưa sửa ngay. | **Deferred:** giữ nguyên đến vòng integration test (BE thật) để xác nhận còn tồn tại; chỉ sửa khi tái hiện được ngoài MSW. |
| M6 | `frontend/src/mocks/handlers/users.handlers.ts` | **MSW-only behavior mismatch:** route public profile `GET /api/users/:username/profile/` luôn trả dữ liệu profile cho mọi username nên case `/profile/nonexistent` không có 404 (A-4-1 fail). | **Deferred (MSW note):** chưa sửa ngay; giữ lại để kiểm thử tích hợp với backend thật. Nếu BE thật trả 404 đúng contract thì chỉ cần sửa mock handler; nếu BE cũng sai thì sửa cả BE + mock. |
| M7 | `frontend/src/mocks/handlers/users.handlers.ts` (`PATCH /api/users/me/account/`) | **MSW-only behavior mismatch:** update username không kiểm tra unique conflict nên đổi sang username đã tồn tại vẫn thành công (B-4-3 fail). | **Deferred (MSW note):** chưa sửa ngay; xác nhận lại ở integration test với BE thật. Chỉ sửa mock khi BE đã enforce unique đúng contract. |

### Low — Minor issues / tech debt

| # | File | Description | Fix |
|---|------|-------------|-----|
| L1 | `ai/services/llm_client.py` | LLM client is a mock — always returns a hardcoded string. | Implement real provider call in Slice 10 (deferred). |
| L2 | `api/models.py` | `QuizQuestion` thiếu composite index trên `(quiz, status)` — field `status` được filter thường xuyên nhưng chỉ có index trên `quiz` đơn lẻ. | Thêm `models.Index(fields=['quiz', 'status'])` trong Meta. |
| L4 | Frontend testing environment (Playwright integrated browser viewport) | Case responsive J-3 (`<=768px`) chưa xác thực được trong phiên tool hiện tại vì viewport thực tế bị giữ ~804px; chưa kết luận pass/fail. | **Deferred test note:** chạy lại bằng Playwright CLI headless/headed ngoài integrated browser để kiểm tra breakpoint chuẩn. |

---

## Fixed Bugs

> Bugs resolved in previous sessions. Kept for history.

| # | Fixed | File | Description | How Fixed |
|---|-------|------|-------------|-----------|
| F1 | 2026-03-09 | `ai/serializers.py` | Typo `"lern_assistant"` in ChoiceField | Corrected to `"learn_assistant"`; now uses `AImode` constants |
| F2 | 2026-03-09 | `ai/models.py` | Field named `node` stored AI mode value — wrong semantics. `__str__` referenced `self.mode` which didn't exist. | Renamed field `node` → `mode`; `__str__` now resolves correctly |
| F3 | 2026-03-09 | `ai/services/context_loader.py` | `lesson.content` doesn't exist on the `Lesson` model | Changed to `lesson.content_md or ""` |
| F4 | 2026-03-09 | `ai/permissons.py` | Filename typo ("permissons"). Used Django's built-in `has_perm()` which violates architecture rules (ARCHITECTURE.md §7) | Renamed to `permissions.py`; rewrote to check JWT claims |
| F5 | 2026-03-09 | `ai/url.py` | Non-standard filename (missing 's') inconsistent with Django convention | Renamed to `urls.py` |
| F6 | 2026-03-09 | `backend/backend/urls.py` | AI URLs not wired into root URLconf | Added `include('ai.urls')` (now commented — AI is deferred) |
| F7 | 2026-03-09 | `backend/backend/settings.py` | `realtime`, `rest_framework`, `corsheaders` missing from `INSTALLED_APPS` | Added all three |
| F8 | 2026-04-01 | `frontend/src/components/layouts/AdminAccessGate.tsx` | Admin route guard could redirect valid admin users to `/{locale}/dashboard` when permission catalog did not include full permission set. | Removed temporary permission-catalog gate and kept auth-only guard until a replacement access mechanism is implemented. |
| F9 | 2026-04-01 | `frontend/src/services/rbac.service.ts`, `frontend/src/hooks/useRbac.ts` | RBAC permission list could arrive as a paginated object, causing `permissionsState.data.filter` to throw at runtime. | Normalized RBAC list responses to arrays in the service and added a defensive array guard in the hook. |
| F10 | 2026-04-14 | `frontend/src/mocks/handlers/quizzes.handlers.ts` | Admin quiz status filter did not affect list rows in MSW (`Draft`/`Published`/`Archived` always returned all rows). | Added `status` query parsing and status-aware filtering before pagination in the quiz list handler. |
| F11 | 2026-04-14 | `frontend/src/components/features/quizzes/QuizFinishScreen.tsx`, `frontend/app/[locale]/(catalog)/quizzes/[id]/session/page.tsx` | Try Again could keep UI in finished state because same-route navigation did not force deterministic remount. | Added restart nonce query (`?restart=<timestamp>`) and keyed session client remount to guarantee fresh WS lifecycle. |
| F12 | 2026-04-14 | `frontend/messages/vi.json`, `frontend/messages/en.json` | Session revoke dialog rendered literal `{device}` instead of interpolated device name. | Removed ICU-escaping single quotes around `{device}` placeholders in both locales. |
| F13 | 2026-04-14 | `frontend/src/components/features/profile/AccountForm.tsx` | Account save button stayed enabled when no field changes were made. | Added normalized `hasChanges` computation and disabled submit when unchanged (`disabled={saving || !hasChanges}`). |
| F14 | 2026-04-14 | `frontend/messages/vi.json`, `frontend/messages/en.json` | Quiz delete confirmation rendered title placeholder text instead of interpolated quiz title. | Removed ICU-escaping single quotes around `{title}` placeholders in both locales. |

---

## Tracking Notes

- **Discovery session:** 2026-03-09 — full project review
- **Architecture violations to guard against:** See `docs/ARCHITECTURE.md` §7 "What NOT To Do"
- **IMPL_PLAN conflicts (not bugs, but inconsistencies to fix):**
  - ~~`IMPL_PLAN.md` Task 0.3 uses `auth.native_enabled` → should be `auth.local_login_enabled` (per `CONFIG.md`)~~ ✅ Fixed 2026-03-12
  - ~~`IMPL_PLAN.md` Task 0.3 uses `ai.daily_limit` → should be `ai.rate_limit_per_hour` (per `CONFIG.md`)~~ ✅ Already correct in current code
  - ~~`IMPL_PLAN.md` Task 0.3 uses `is_secret=BooleanField` pattern → should use `value_type='secret'` (per `DATA_MODEL.md`)~~ ✅ Fixed 2026-03-12
  - ~~`ARCHITECTURE.md` §6 diagram lists `auth` app → should be `auth_app`~~ ✅ Already correct in current code
  - `prd/01-authentication.md` FR-AUTH-10 used `auth.native_enabled` → updated to `auth.local_login_enabled` ✅ Fixed 2026-03-12
  - `prd/10-system-config.md` FR-CFG-05 used outdated key names → updated to match `CONFIG.md` ✅ Fixed 2026-03-12
  - `prd/01-authentication.md` edge case table used `native_enabled` → `local_login_enabled` ✅ Fixed 2026-03-12
  - `prd/04-challenge.md` edge case table used `deploy_enabled` → `deploy.enabled` ✅ Fixed 2026-03-12
  - `prd/09-ai-assistant.md` used `ollama` provider → updated to `anthropic` (per `CONFIG.md`) ✅ Fixed 2026-03-12
  - `prd/09-ai-assistant.md` missing `ai.enabled` key → added ✅ Fixed 2026-03-12
  - `prd/10-system-config.md` missing `auth.email.use_tls`, `auth.email.username`, `auth.email.sender_name` → added ✅ Fixed 2026-03-12
  - `docs/DATA_MODEL.md` header claimed `dbv3.sql` as source of truth → corrected to self-authoritative ✅ Fixed 2026-03-12
  - `IMPL_PLAN.md` seed_config missing `auth.registration_enabled` → added ✅ Fixed 2026-03-12
