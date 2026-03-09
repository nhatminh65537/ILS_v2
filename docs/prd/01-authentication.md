# PRD-01: Authentication

**Feature:** Authentication
**Status:** Planned
**Priority:** High

---

## Context

ILS v2 cần hỗ trợ hai phương thức xác thực: **đăng nhập nội bộ** (username/password) và **SSO qua Authentik** (OpenID Connect / OAuth2). Admin có thể bật/tắt từng phương thức, cấu hình email hệ thống, và cho phép liên kết tài khoản. Refresh token hỗ trợ đa thiết bị và được lưu dưới dạng hash trong bảng `user_session`.

---

## Problem

Hệ thống chưa có cơ chế xác thực nào được triển khai. Người dùng không thể đăng ký, đăng nhập, hoặc duy trì phiên làm việc. Thiếu SSO có nghĩa là tổ chức không thể tái sử dụng tài khoản Authentik đã có. Không có rate limiting khiến hệ thống dễ bị brute-force.

---

## Goal

1. Cho phép người dùng đăng nhập/đăng ký bằng username + password nội bộ.
2. Hỗ trợ SSO qua Authentik (OIDC), tự động tạo tài khoản nếu là lần đầu.
3. Quản lý phiên đa thiết bị với JWT (access + refresh token).
4. Admin có thể bật/tắt từng phương thức xác thực và cấu hình email.
5. Cho phép liên kết tài khoản nội bộ với SSO.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-AUTH-01 | Member | Tôi muốn đăng ký tài khoản bằng username và password để truy cập hệ thống. | High |
| US-AUTH-02 | Member | Tôi muốn đăng nhập bằng username/password và nhận JWT để xác thực các API tiếp theo. | High |
| US-AUTH-03 | Member | Tôi muốn đăng nhập qua SSO (Authentik) để dùng tài khoản tổ chức. | High |
| US-AUTH-04 | Member | Tôi muốn refresh token để không bị đăng xuất khi access token hết hạn. | High |
| US-AUTH-05 | Member | Tôi muốn đăng xuất và thu hồi phiên hiện tại. | High |
| US-AUTH-06 | Member | Tôi muốn đổi mật khẩu sau khi xác thực. | Medium |
| US-AUTH-07 | Member | Tôi muốn reset mật khẩu qua email khi quên. | Medium |
| US-AUTH-08 | Member | Tôi muốn liên kết tài khoản nội bộ với SSO để dùng cả hai. | Medium |
| US-AUTH-09 | Member | Tôi muốn xem và thu hồi các phiên đăng nhập từ thiết bị khác. | Medium |
| US-AUTH-10 | Admin | Tôi muốn bật/tắt native login hoặc SSO để kiểm soát phương thức đăng nhập. | High |
| US-AUTH-11 | Admin | Tôi muốn cấu hình thông tin email hệ thống để gửi email reset password. | Medium |

---

## Functional Requirements

### FR-AUTH-01: Native Registration
- Nhận `username`, `password`, `email` (optional).
- Validate username unique, password strength (min 8 ký tự).
- Tạo bản ghi `user` và `user_profile`.
- Trả về access token + refresh token.
- Chỉ hoạt động khi `system_config[auth.native_enabled] = true`.

### FR-AUTH-02: Native Login
- Nhận `username` + `password`.
- Kiểm tra `user.is_active`.
- Rate limiting: sau 5 lần thất bại liên tiếp → lock 15 phút.
- Tạo bản ghi `user_session` (lưu `refresh_token_hash`, `device_info`, `expires_at`).
- Trả về access token (short-lived) + refresh token (long-lived).

### FR-AUTH-03: SSO Login (Authentik)
- Redirect người dùng tới Authentik OIDC authorization endpoint.
- Sau callback: nhận `code`, exchange lấy `id_token`.
- Tra `user_identity` theo `provider=authentik` + `external_id`.
- Nếu chưa có: tạo `user` + `user_profile` + `user_identity` mới.
- Nếu đã có: đăng nhập như bình thường.
- Tạo `user_session`, trả về JWT.

### FR-AUTH-04: Token Refresh
- Nhận refresh token.
- Hash token, tra `user_session` theo hash.
- Kiểm tra `expires_at` và `revoked_at`.
- Kiểm tra `user.permission_version` vs `user_permission_cache.permission_version` → re-encode nếu lỗi thời.
- Trả về access token mới (và optionally refresh token mới — rotation).

### FR-AUTH-05: Logout
- Thu hồi `user_session` hiện tại (set `revoked_at`).
- Optionally: thu hồi tất cả phiên của user (logout everywhere).

### FR-AUTH-06: Password Change
- Yêu cầu current password (hoặc valid token).
- Cập nhật `user.password`.
- Thu hồi tất cả `user_session` hiện có (force re-login).

### FR-AUTH-07: Password Reset
- Gửi link reset qua email (hết hạn sau 1 giờ).
- Link chứa signed token (không lưu DB, dùng HMAC).
- Sau reset: thu hồi tất cả phiên.

### FR-AUTH-08: Account Linking
- User đã đăng nhập → thêm `user_identity` với provider mới.
- Chỉ cho phép khi `system_config[auth.link_accounts_enabled] = true`.
- Mỗi `(provider, external_id)` unique.

### FR-AUTH-09: Session Management
- List: trả về danh sách `user_session` active của user (ẩn `refresh_token_hash`).
- Revoke: thu hồi theo `session_id`.

### FR-AUTH-10: Admin Config
- CRUD `system_config` cho category `auth`.
- Keys: `auth.native_enabled`, `auth.sso_enabled`, `auth.link_accounts_enabled`, `auth.email_host`, `auth.email_port`, `auth.email_from`.

---

## Edge Cases

| Case | Handling |
|------|----------|
| SSO user cố đăng nhập native (password = NULL) | Trả lỗi 400: "Account uses SSO only" |
| Native login khi `native_enabled = false` | Trả lỗi 403: "Native login disabled" |
| SSO callback với `external_id` đã liên kết user khác | Reject, trả lỗi 409 |
| Refresh token đã bị revoke | Trả 401 Unauthorized |
| Refresh token hết hạn | Trả 401 Unauthorized |
| User bị vô hiệu hóa (`is_active=false`) | Tất cả API trả 401 |
| Email reset không tồn tại trong hệ thống | Trả 200 (không leak thông tin) |
| Đăng ký username đã tồn tại | Trả lỗi 400 với field error |
| SSO không cấu hình nhưng user click đăng nhập SSO | Trả lỗi 503 "SSO not configured" |

---

## API / Data Structure

### Endpoints

```
POST /api/auth/register/              # Native register
POST /api/auth/login/                 # Native login
GET  /api/auth/sso/redirect/          # Redirect to Authentik
GET  /api/auth/sso/callback/          # Authentik OIDC callback
POST /api/auth/token/refresh/         # Refresh access token
POST /api/auth/logout/                # Revoke current session
POST /api/auth/logout-all/            # Revoke all sessions
POST /api/auth/password/change/       # Change password
POST /api/auth/password/reset/        # Request password reset
POST /api/auth/password/reset/confirm/ # Confirm password reset
POST /api/auth/identity/link/         # Link SSO account
GET  /api/auth/sessions/              # List active sessions
DELETE /api/auth/sessions/{id}/       # Revoke session
```

### Key DB Tables

```sql
-- user: id, username, password (nullable), email, is_active, permission_version
-- user_identity: user_id, provider, external_id, extra_data, is_primary, is_active
-- user_session: user_id, device_info, refresh_token_hash, last_used_at, expires_at, revoked_at
-- system_config: key, value, value_type, category='auth'
```

### JWT Payload

```json
{
  "user_id": 42,
  "username": "alice",
  "permissions": ["learn.view", "challenge.submit"],
  "permission_version": 7,
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Request/Response Examples

**POST /api/auth/login/**
```json
Request:  { "username": "alice", "password": "securepass123" }
Response: { "access": "<jwt>", "refresh": "<token>", "user": { "id": 42, "username": "alice" } }
```

**POST /api/auth/token/refresh/**
```json
Request:  { "refresh": "<token>" }
Response: { "access": "<new_jwt>" }
```

---

## Acceptance Criteria

### AC-AUTH-01: Native Login Success
```
Given: User alice tồn tại với password hợp lệ và is_active=true
When: POST /api/auth/login/ với {"username":"alice","password":"correct"}
Then: Response 200, chứa access token và refresh token hợp lệ
  And: user_session mới được tạo trong DB
```

### AC-AUTH-02: Rate Limiting
```
Given: User alice tồn tại
When: POST /api/auth/login/ với sai password 5 lần liên tiếp
Then: Lần thứ 6 trả về 429 Too Many Requests
  And: Sau 15 phút lock được tự động gỡ
```

### AC-AUTH-03: SSO First Login
```
Given: SSO enabled, user chưa tồn tại trong hệ thống
When: User hoàn thành OIDC flow với Authentik
Then: User mới được tạo trong bảng user
  And: user_identity record được tạo với provider='authentik'
  And: user_profile được tạo
  And: JWT được trả về
```

### AC-AUTH-04: Token Refresh
```
Given: User có refresh token hợp lệ chưa expired chưa revoked
When: POST /api/auth/token/refresh/ với token đó
Then: Response 200 với access token mới hợp lệ
```

### AC-AUTH-05: Revoked Token Rejected
```
Given: User đã logout (session revoked)
When: POST /api/auth/token/refresh/ với refresh token cũ
Then: Response 401 Unauthorized
```

### AC-AUTH-06: SSO Disabled
```
Given: system_config[auth.sso_enabled] = false
When: GET /api/auth/sso/redirect/
Then: Response 403 "SSO login is disabled"
```

### AC-AUTH-07: Native Disabled
```
Given: system_config[auth.native_enabled] = false
When: POST /api/auth/login/
Then: Response 403 "Native login is disabled"
```

### AC-AUTH-08: Password Change Invalidates Sessions
```
Given: User alice đăng nhập từ 3 thiết bị
When: POST /api/auth/password/change/ thành công
Then: Tất cả user_session của alice bị revoke
  And: Các refresh token cũ trả 401
```
