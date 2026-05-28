# Session Report: Auth & Session Hardening (Integration Test Pass 1 — nhóm A)

**Date:** 2026-05-29
**Slices / Areas:** Slice 1 (Auth) hardening — fix 8 bug phát hiện trong Integration Test Pass 1 nhóm A

## Summary

Người dùng chạy manual test nhóm A theo `plan/integration-test-1.md` và báo cáo 10 vấn đề. Sau khi double-check trong code path, 8/10 là bug thật (2 không phải bug, được giữ nguyên với ghi chú). Đợt fix này đóng cả **2 lỗ hổng security CRITICAL** (A-06 JWT refresh race, A-08 logout-all không thực sự kill session khác) cùng các bug HIGH/MEDIUM khác về register/email integrity, rate-limit, logout UX, dashboard permission gate. Plan đã được người dùng phê duyệt trước khi implement (file: `plan/integration-test-1.md` chi tiết hoá trong `C:\Users\Thai Nhat Minh\.claude\plans\plan-integration-test-1-md-t-i-test-lively-kay.md`).

Tham chiếu: `docs/BUGS.md` → F37.

## Completed Items

- [x] F1 — Email unique constraint (partial unique when non-empty) + serializer validate (A-02-a)
- [x] F2 — JWT refresh grace window 10s (BE phần của A-06)
- [x] F3 — `RevocationCheckingJWTAuthentication` + claim `session_id` mỗi JWT (A-08); WS consumers cũng check `session_id`
- [x] F4 — Rate-limit login chuyển từ sliding window sang fixed window (A-05)
- [x] Migration `0010_auth_session_hardening` (UserSession.replaced_by/replaced_at + index, User.email partial unique constraint, RunPython blank duplicate emails)
- [x] F5 — Axios refresh-mutex promise singleton (FE phần của A-06)
- [x] F6 — Logout flow: clear store sync trước, hard-nav `window.location.assign` (`_-01`, `_-02`)
- [x] F7 — Cross-tab logout broadcast qua `BroadcastChannel('ils-auth')` (A-08 FE side)
- [x] F8 — Auth error mapping thêm keyword `already exists`/`duplicate` + i18n key `usernameTaken`/`emailTaken` (A-02-b)
- [x] F9 — Dashboard gate admin link qua `AdminPortalCard` (`_-03`)
- [x] Update test `test_token_refresh_old_token_invalid_after_rotation` cho contract mới
- [x] Sửa SSO service và views.py cho API mới `issue_tokens_for_new_session`
- [x] Update `docs/BUGS.md` (entry F37), `docs/STATUS.md` (header), `plan/integration-test-1.md` (A-05 expected)
- [x] pytest auth_app + realtime: 53/53 pass (loại trừ 1 test broken pre-existing không liên quan)

## Key Implementations

### Custom JWT auth class (F3 — A-08)

1. `TokenService.issue_tokens_for_new_session` đổi flow: gọi `SessionService.create_empty_session(user)` lấy `session.id` → sign JWT có claim `session_id` → `attach_refresh_token(session, token)` ghi hash. Đảm bảo claim luôn match một row `UserSession` tồn tại.
2. `RevocationCheckingJWTAuthentication.get_user` extends stock `JWTAuthentication`: sau khi validate chữ ký/expiry, đọc `session_id` từ token. Nếu không có (legacy token) → chấp nhận để không mass-logout khi deploy. Nếu có → check cache `session_active:{id}`; cache miss → query `UserSession.objects.filter(id=..., revoked_at__isnull=True).exists()`, ghi cache TTL 30s.
3. `SessionService.revoke_session_by_*` và `revoke_all_user_sessions` invalidate cache key tương ứng ngay sau khi update DB → revoke có hiệu lực gần như tức thì (cache TTL 30s là worst-case lag cho các hit cache trước thời điểm revoke).
4. WS consumers (`notification_consumer`, `quiz_consumer`) cũng decode `session_id` và check cùng cách → A-08 covered cho cả WebSocket.

### Refresh grace window (F2 — A-06 BE)

1. `UserSession` thêm `replaced_by` (FK self) + `replaced_at`. Khi `refresh_tokens` rotate: tạo `new_session` (2-phase) → mark `old_session.replaced_by = new_session, replaced_at = now, revoked_at = now`.
2. `refresh_tokens` primary lookup: session với `refresh_token_hash` AND `revoked_at IS NULL`. Nếu không tìm thấy → grace lookup: session với cùng hash AND `replaced_at >= now - 10s` AND `replaced_by IS NOT NULL`. Nếu trúng và successor còn active → re-issue tokens lên successor (re-attach refresh_token_hash) thay vì rotate tiếp. Idempotent cho các refresh đồng thời.
3. Sau 10s grace window, refresh token cũ bị reject (401) như bình thường → vẫn an toàn về security.

### Refresh mutex FE (F5 — A-06 FE)

1. Module-scope `let inflightRefresh: Promise<string> | null = null` trong `axios.ts`.
2. Khi nhận 401: nếu `inflightRefresh === null`, tạo promise gọi POST refresh → gán vào `inflightRefresh`; mọi 401 đồng thời `await` cùng promise.
3. `finally` clear `inflightRefresh = null` → các 401 ở tương lai sẽ tự tạo promise mới.
4. Kết hợp với F2: thậm chí khi mutex bị bypass (ví dụ 2 tab khác nhau), BE grace window vẫn handle idempotent.

### Logout race fix (F6 — `_-01`, `_-02`)

1. `useAuth.logout`: clear store + localStorage **đồng bộ** trước khi `await` server revoke. Server revoke best-effort (try/catch ignore).
2. `SessionNavControls.handleLogout`: dùng `window.location.assign('/.../login')` thay `router.replace + router.refresh`. Hard navigation loại bỏ hoàn toàn race với React state / `GuestOnlyGate` (gate cũ thấy `accessToken` còn trong store → bounce sang `/dashboard`).
3. `AccountForm` (flow đổi username → logout-all → redirect) cũng đồng bộ pattern: clearAuth → await logoutAll → hard nav.

### Cross-tab logout broadcast (F7 — A-08 FE)

1. `auth.store.clearAuth` dispatch `BroadcastChannel('ils-auth').postMessage({type: 'logout'})`.
2. `useAuth.useEffect` subscribe `BroadcastChannel('ils-auth')`: khi nhận `logout` → `clearAuth()` + hard nav login. Tab khác cùng browser logout instant.
3. Tab ở browser KHÁC dựa vào BE check (F3) sẽ 401 trong lần request kế tiếp (cache TTL ≤30s lag).

### Email uniqueness (F1 — A-02-a)

1. `User.Meta.constraints = [UniqueConstraint(fields=['email'], condition=Q(email__gt=''), name='uniq_user_email_when_present')]` — partial unique chỉ apply khi email không rỗng (cho phép nhiều user không khai email).
2. `RegisterRequestSerializer.validate_email`: nếu value và đã tồn tại (case-insensitive) → raise ValidationError với key `email` → FE map sang `auth.errors.emailTaken`.
3. Migration `0010` có `RunPython blank_duplicate_emails`: trước khi tạo constraint, scan user và blank email duplicate (giữ user id nhỏ nhất) để migration không fail trên DB dev hiện có data trùng.

### Rate-limit fixed window (F4 — A-05)

1. `cache.add(key, 1, timeout=300)` tạo key chỉ khi chưa tồn tại — TTL được "đóng băng" từ fail đầu tiên.
2. Các fail sau gọi `cache.incr(key)` — không reset TTL.
3. Sau 5 phút kể từ fail đầu, key tự expire → user login lại được mà không cần manual cleanup.

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/api/models.py` | `User.email` partial unique constraint; `UserSession` thêm `replaced_by` + `replaced_at` + index |
| `backend/api/migrations/0010_auth_session_hardening.py` (new) | Schema migration + RunPython blank duplicate emails |
| `backend/auth_app/authentication.py` (new) | `RevocationCheckingJWTAuthentication` |
| `backend/auth_app/services/token_service.py` | `issue_tokens_for_new_session` (2-phase) + `session_id` claim + refresh grace window |
| `backend/auth_app/services/session_service.py` | `create_empty_session`/`attach_refresh_token`; rotate set `replaced_*`; cache invalidation `session_active:{id}` |
| `backend/auth_app/services/sso_service.py` | Chuyển sang `issue_tokens_for_new_session`; bỏ import `SessionService` |
| `backend/auth_app/views.py` | Login dùng fixed-window rate limit; register + login dùng `issue_tokens_for_new_session` |
| `backend/auth_app/serializers.py` | `validate_email` reject duplicate (case-insensitive) |
| `backend/auth_app/constants.py` | `SESSION_ACTIVE_CACHE_KEY_TEMPLATE`, `REFRESH_GRACE_WINDOW_SECONDS=10`, `SESSION_ACTIVE_CACHE_TTL_SECONDS=30` |
| `backend/backend/settings.py` | `DEFAULT_AUTHENTICATION_CLASSES` swap sang `auth_app.authentication.RevocationCheckingJWTAuthentication` |
| `backend/realtime/consumers/notification_consumer.py` | WS auth check `session_id` revoked |
| `backend/realtime/consumers/quiz_consumer.py` | WS auth check `session_id` revoked + helper `_session_is_active` |
| `backend/auth_app/tests/test_auth_api.py` | Update `test_token_refresh_old_token_invalid_after_rotation` cho grace contract |
| `frontend/src/lib/axios.ts` | Promise-singleton `inflightRefresh` |
| `frontend/src/lib/auth-error-map.ts` | Thêm keyword `already exists`/`duplicate` + field-key extraction (username/email) |
| `frontend/src/hooks/useAuth.ts` | `logout` clear sync trước; `BroadcastChannel('ils-auth')` listener |
| `frontend/src/stores/auth.store.ts` | `clearAuth` broadcast `{type:'logout'}` |
| `frontend/src/components/layouts/SessionNavControls.tsx` | Hard nav `window.location.assign`; bỏ unused `useRouter` |
| `frontend/src/components/features/profile/AccountForm.tsx` | Hard nav cho logout-all flow; bỏ unused `useRouter` |
| `frontend/src/components/features/dashboard/AdminPortalCard.tsx` (new) | Client component gate Admin card bằng `hasAdminSurfaceAccess(token)` |
| `frontend/app/[locale]/(app)/dashboard/page.tsx` | Bỏ Admin card cố định; render `<AdminPortalCard />` |
| `frontend/messages/{vi,en}.json` | Thêm `auth.errors.{usernameTaken,emailTaken}` |
| `docs/BUGS.md` | Entry F37 |
| `docs/STATUS.md` | Header "Last updated" |
| `plan/integration-test-1.md` | A-05 expected — 5 phút (không 1 phút) |

## Notes / Caveats

- **Pre-existing failure không nằm trong scope**: `realtime/tests/test_notification_consumer.py::test_notification_ws_broadcast_fanout_to_active_connections` fail vì `NotificationService.broadcast_notification()` thiếu kwarg `actor` (test signature mismatch). Cần được fix riêng — không liên quan auth.
- **Pre-existing TS error không nằm trong scope**: `frontend/src/components/features/challenges/admin/AdminChallengeCreatePageClient.tsx:61` — type signature mismatch `CreateChallengePayload | UpdateChallengePayload`. Cần fix riêng.
- **Legacy tokens** (issued trước khi có claim `session_id`) vẫn được chấp nhận để tránh mass-logout khi deploy. User logout/login một lần sẽ nhận token có `session_id` đầy đủ.
- **Cache backend** hiện là `LocMemCache` (per-process). Trong production multi-worker cần đổi sang Redis để session-active cache đồng bộ giữa các worker. Đã được note trong DECISIONS.md → Q-INFRA-04.
- **A-07 (revoke current session)** và **A-04 (login/register error format khác nhau)** không phải bug → không fix. Giải thích chi tiết trong plan và F37 BUGS entry.
- **Manual end-to-end verification** vẫn chưa chạy đầy đủ (pytest cover BE; FE cần human test trên browser). Người dùng được khuyến nghị re-run A-01 → A-10 + đặc biệt A-06 / A-08 cross-browser theo §Verification của plan.
- **Memory update**: cần lưu pattern "JWT session_id claim + RevocationCheckingJWTAuthentication" vào openmemory.md / OpenMemory MCP nếu chưa có entry tương tự.
