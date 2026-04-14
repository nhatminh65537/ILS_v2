# BUGS.md — ILS v2 Known Bugs & Issues

> Track all known bugs here. Update when fixing or discovering new issues.
> Format: one table per severity level. Move bugs to **Fixed** section after resolving.

---

## Active Bugs

### High — Breaks functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| H3 | `frontend/src/components/layouts/AdminAccessGate.tsx` + admin routes `frontend/app/[locale]/(admin)/admin/(protected)/*` | **Admin route authorization bypass ở frontend:** user đã đăng nhập nhưng không có quyền admin (ví dụ `member3`) vẫn truy cập được `/vi/admin/users` trong phiên test Slice 8 (F-1-5 fail). Hiện guard chỉ kiểm tra authenticated, không kiểm tra role/permission claim. Khi backend chạy với authz bypass hoặc kiểm tra chưa chặt sẽ thành lỗ hổng truy cập bề mặt quản trị. | Bổ sung authorization gate cho admin surface dựa trên claims/permission đã chuẩn hóa (không dùng Django built-in). Giữ route-level deny rõ ràng (redirect admin login hoặc 403) cho non-admin. |
| H7 | `frontend/app/[locale]/(admin)/admin/users/*` + admin routing guard | **Route admin users không truy cập được ổn định:** browser integration 2026-04-14 cho thấy điều hướng tới `/vi/admin/users` bị trả về `/vi/admin/rbac`, làm checklist Slice 8 Task 8.4 không verify được end-to-end UI. | Kiểm tra route mapping/redirect trong admin shell + middleware/guard; đảm bảo `/admin/users` giữ nguyên URL và render user management page cho admin token hợp lệ. |

### Medium — Degrades functionality

| # | File | Description | Fix |
|---|------|-------------|-----|
| M8 | `backend/api/views/quizzes.py` (`QuizViewSet.get_queryset`) | **Member vẫn lọc được draft quiz qua query param:** `GET /api/quiz/quizzes/?status=draft` với member token trả về draft item (`I-3.3` fail). Điều này mâu thuẫn rule "member chỉ thấy published". | Ưu tiên filter theo role trước: nếu không phải editor/admin thì luôn ép `status=published`, bỏ qua query param status từ client. |
| M11 | `backend/api/serializers.py` (`MeSettingsUpdateSerializer`) | **Settings API chưa validate enum theo contract:** `PATCH /api/users/me/settings/` với `language=fr` và `theme=blue` vẫn `200` trong integration run 2026-04-14 (`II-3.3`, `II-3.4` fail kỳ vọng `400`). | Áp ChoiceField/validator theo enum chuẩn của `UserProfile.language` và `UserProfile.theme`; bổ sung test negative case ở `backend/api/test_profile_task8_1.py`. |

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
| F15 | 2026-04-14 | `api/admin_views.py` → `api/views/system_config.py` | **H1**: `SystemConfigViewSet` dùng `IsAdminUser` (Django built-in, kiểm tra `is_staff`) thay vì RBAC. Toàn bộ admin viewsets thiếu unified permission enforcement. | Xóa `admin_views.py` + `mixins/rbac_action_permission.py`; chuyển toàn bộ admin viewsets vào `api/views/`; tất cả viewsets dùng `permission_classes = [IsAuthenticated, HasJWTPermission]` — không còn `IsAdminUser`, không còn `action_permission_map`. |
| F16 | 2026-04-14 | `api/views/quizzes.py` (`QuizActionPermission`) | **H5**: `QuizNodeViewSet` dùng `QuizActionPermission` (custom class check DB roles) thay vì RBAC bitmap → editor và member bị block sai. | Xóa `QuizActionPermission`; `QuizNodeViewSet` và `QuizViewSet` đều dùng `HasJWTPermission` với `@add_role_granted` per-method; RBAC bitmap check đúng vai trò. |
| F17 | 2026-04-14 | `api/mixins/rbac_action_permission.py` + tất cả ViewSets | **M1**: `action_permission_map` hardcode permission string (ví dụ `'api.role.list'`) — không đồng bộ tự động với scanner. | Thêm `derive_permission_key()` shared utility vào `auth_app/permissions.py`; `HasJWTPermission` tự suy key từ `view.__class__` + `view.action`; xóa toàn bộ `action_permission_map`. |
| F18 | 2026-04-14 | `backend/api/urls.py`, `backend/api/views/quizzes.py`, `backend/api/test_quiz_task7_1.py` | **H4**: Quiz progress endpoint bị 404 do thiếu route wiring dù handler đã có sẵn. | Bổ sung route `GET /api/quiz/quizzes/{id}/progress/` và thêm regression tests cho case có/không có progress record. |
| F19 | 2026-04-14 | `backend/api/serializers.py` | **H6**: Admin create/update user chưa chặn trùng `email`/`username` theo unique không phân biệt hoa thường. | Thêm `validate_username` + `validate_email` cho `AdminUserManagementSerializer` dùng check `iexact` loại trừ bản ghi hiện tại. |
| F20 | 2026-04-14 | `frontend/app/[locale]/(public)/profile/[username]/page.tsx`, `frontend/src/components/features/profile/PublicProfileView.tsx`, `frontend/src/mocks/handlers/users.handlers.ts` | **H8 + M6**: Public profile route bị redirect bởi authenticated shell; MSW profile handler không trả 404 cho username không tồn tại. | Chuyển public profile sang public route group (không qua `UserAccessGate`), thêm not-found dialog UX, và sửa MSW trả 404 đúng contract cho username không tồn tại. |
| F21 | 2026-04-14 | `frontend/src/components/features/profile/AccountForm.tsx`, `frontend/src/components/features/profile/ProfileSettingsView.tsx`, `frontend/src/lib/axios.ts`, `frontend/src/mocks/handlers/users.handlers.ts` | **M7**: UX/account update xử lý kém khi đổi username (thiếu confirm + thiếu force re-login); MSW không check unique conflict; lỗi field-level bị nuốt thành generic. | Thêm dialog xác nhận trước khi đổi username; nếu confirm thì save + force logout/login lại; đồng bộ auth user state khi chỉ đổi email; giữ nguyên payload lỗi field-level trong axios interceptor; thêm unique conflict check trong MSW account patch handler. |
| F22 | 2026-04-14 | `backend/api/serializers.py`, `backend/api/test_quiz_task7_1.py` | **M9**: Quiz detail thiếu `category` trong response payload. | Thêm `category = QuizCategorySerializer(read_only=True)` vào `QuizDetailSerializer` và thêm regression test xác nhận field `category` xuất hiện đúng dữ liệu. |
| F23 | 2026-04-14 | `backend/api/serializers.py`, `backend/api/test_quiz_task7_1.py` | **M10**: Thiếu ràng buộc `quiz_point >= 0` khi tạo/cập nhật quiz. | Thêm `quiz_point = IntegerField(min_value=0)` trong `QuizListSerializer` và thêm regression test tạo quiz điểm âm trả `400`. |

---

## Doc–Code Inconsistencies (awaiting human decision)

> These are **not runtime bugs** — they are mismatches between `docs/DATA_MODEL.md` (authoritative) and `backend/api/models.py` (implementation). Per conflict rules: DATA_MODEL.md wins. Human must decide whether to implement the missing fields in models.py or explicitly defer/remove from DATA_MODEL.md.

| # | Location | DATA_MODEL.md says | models.py has | Decision needed |
|---|----------|--------------------|---------------|-----------------|
| D-DOC-01 | `course` table | `structure_version` INTEGER NOT NULL DEFAULT 1 | **Field missing** | Add to models.py (+ migration) or mark deferred in DATA_MODEL.md |
| D-DOC-02 | `lesson` table | `status` content_status NOT NULL DEFAULT 'draft' | **Field missing** | Add to models.py (+ migration) or mark deferred in DATA_MODEL.md |
| D-DOC-03 | `lesson` table | `video_duration` **not documented** | `video_duration` IntegerField nullable exists | Add to DATA_MODEL.md |

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
  - `docs/DATA_MODEL.md` vs `backend/api/models.py` — 3 field inconsistencies found 2026-04-14 (see D-DOC-01, D-DOC-02, D-DOC-03 below — awaiting human decision)
