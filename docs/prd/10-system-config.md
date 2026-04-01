# PRD-10: System Configuration

**Feature:** System Configuration — Cấu hình hệ thống
**Status:** Planned
**Priority:** High (prerequisite for other features)

---

## Context

ILS v2 là hệ thống self-hosted, cần khả năng cấu hình runtime mà không cần sửa code hay restart server. `system_config` table lưu key-value pairs với type system (`bool`, `int`, `string`, `json`, `secret`). Cấu hình bao gồm: auth methods, external integrations (Outline, GitLab, AI), behavior settings. Admin quản lý qua UI hoặc API.

---

## Problem

Toàn bộ cấu hình tích hợp (Outline URL, GitLab URL, AI API key, v.v.) bị hardcode. Không có giao diện để admin thay đổi. Khi đổi hostname phải sửa code và restart.

---

## Goal

1. Admin xem và chỉnh sửa cấu hình runtime qua API.
2. Cấu hình nhóm theo category (auth, learn, challenge, ai, v.v.).
3. `secret` type được mã hóa khi lưu, mặc định không trả về giá trị trong GET.
4. Validation type-safe khi update value.
5. Một số config có `is_editable=False` (readonly, chỉ system set).

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-CFG-01 | Admin | Tôi muốn xem tất cả cấu hình của hệ thống theo nhóm. | High |
| US-CFG-02 | Admin | Tôi muốn cập nhật giá trị cấu hình (Outline URL, GitLab token, ...). | High |
| US-CFG-03 | Admin | Tôi muốn bật/tắt tính năng native login hoặc SSO. | High |
| US-CFG-04 | Admin | Tôi muốn cấu hình URL và API key cho Outline. | Medium |
| US-CFG-05 | Admin | Tôi muốn cấu hình URL và token cho GitLab. | Medium |
| US-CFG-06 | Admin | Tôi muốn cấu hình LLM provider cho AI assistant. | Medium |
| US-CFG-07 | System | Khi khởi động, hệ thống seed các config keys với default values nếu chưa tồn tại. | High |

---

## Functional Requirements

### FR-CFG-01: Config CRUD
- GET `/api/admin/config/` — list all configs grouped by category.
- GET `/api/admin/config/{key}/` — single config detail.
- PATCH `/api/admin/config/{key}/` — update value.
- Chỉ cho phép update `is_editable=True` configs.
- Type validation:
  - `bool`: only `true`/`false`.
  - `int`: numeric only.
  - `string`: any string.
  - `json`: valid JSON.
  - `secret`: any string, stored encrypted, masked by default in GET.

### FR-CFG-02: Secret Handling
- `value_type=secret`: encrypt before storing (AES or Django's built-in `SECRET_KEY`-based encryption).
- GET response: return `"***"` by default.
- Clear value chỉ trả cho user có quyền thủ công `system.config.view_secret` (seeded manual permission).
- Internal read (services): decrypt on access.

### FR-CFG-03: Startup Seed
- `AppConfig.ready()` seeds default config keys if they don't exist (INSERT IF NOT EXISTS).
- Never overwrite existing values on restart.
- Default keys seeded on startup (see table below).

### FR-CFG-04: Config Access in Code
- `ConfigService.get(key, default=None)` — unified accessor.
- Caches in-memory per request (not per process, to pick up changes).
- `is_runtime=True` keys: re-read from DB on each access (no cache).

### FR-CFG-05: Predefined Config Keys

> **Authoritative reference:** See `docs/CONFIG.md` for the complete config catalog with all keys,
> types, defaults, and descriptions. The table below is a summary — if conflicts exist, CONFIG.md wins.

| Key | Type | Category | Default | Description |
|-----|------|----------|---------|-------------|
| `auth.local_login_enabled` | bool | auth | true | Enable native login/register |
| `auth.registration_enabled` | bool | auth | true | Allow new users to self-register |
| `auth.sso_enabled` | bool | auth | false | Enable SSO via Authentik |
| `auth.sso_client_id` | string | auth | "" | Authentik OAuth2 client ID |
| `auth.sso_client_secret` | secret | auth | "" | Authentik OAuth2 client secret |
| `auth.sso_base_url` | string | auth | "" | Authentik base URL |
| `auth.link_accounts_enabled` | bool | auth | true | Allow SSO-native linking |
| `auth.authorization_enabled` | bool | auth | true | Enable RBAC permission checks (dev toggle) |
| `auth.email.host` | string | auth | "" | SMTP host |
| `auth.email.port` | int | auth | 587 | SMTP port |
| `auth.email.use_tls` | bool | auth | true | Use STARTTLS for SMTP |
| `auth.email.username` | string | auth | "" | SMTP auth username |
| `auth.email.password` | secret | auth | "" | SMTP password |
| `auth.email.sender_name` | string | auth | "ILS Platform" | Display name in From field |
| `auth.email.sender_address` | string | auth | "" | From email address |
| `learn.max_tree_depth` | int | learn | 5 | Max folder depth in course tree |
| `learn.max_nodes_per_course` | int | learn | 500 | Max total nodes per course |
| `outline.enabled` | bool | outline | false | Enable Outline integration |
| `outline.url` | string | outline | "" | Outline instance base URL |
| `outline.api_token` | secret | outline | "" | Outline API token |
| `challenge.deploy.enabled` | bool | challenge | false | Enable instance deployment |
| `challenge.deploy.api_url` | string | challenge | "" | Deploy server API URL |
| `challenge.deploy.api_token` | secret | challenge | "" | Deploy server API token |
| `challenge.instance_ttl_minutes` | int | challenge | 60 | Instance TTL in minutes |
| `challenge.git.enabled` | bool | challenge | false | Enable GitLab integration |
| `challenge.git.url` | string | challenge | "" | GitLab instance URL |
| `challenge.git.token` | secret | challenge | "" | GitLab API token |
| `ai.enabled` | bool | ai | false | Enable AI assistant |
| `ai.provider` | string | ai | "openai" | LLM provider |
| `ai.model` | string | ai | "gpt-4o-mini" | LLM model name |
| `ai.api_key` | secret | ai | "" | LLM API key |
| `ai.base_url` | string | ai | "" | Custom LLM base URL |
| `ai.rate_limit_per_hour` | int | ai | 20 | Max AI requests per user per hour |

> **Note:** `permission_version` is per-user (field on `user` model), NOT a system_config key.
> See [R-AUTH-07](../DECISIONS.md) for the resolved decision.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Update non-editable config | Trả lỗi 403 "Config is not editable" |
| Invalid type value (string for bool key) | Trả lỗi 400 với type mismatch message |
| GET secret key | Return masked value `"***"` |
| Seed on restart: key already exists | Skip, không overwrite |
| Config key không tồn tại | Trả 404 |
| Xóa config (DELETE) | Không cho phép (400) |

---

## API / Data Structure

### Endpoints

```
GET   /api/admin/config/              # All configs grouped by category
GET   /api/admin/config/{key}/        # Single config
PATCH /api/admin/config/{key}/        # Update value
```

### Config List Response

```json
{
  "auth": [
    { "key": "auth.local_login_enabled", "value": true, "value_type": "bool", "is_editable": true, "description": "Enable native login/register" },
    { "key": "auth.sso_client_secret", "value": "***", "value_type": "secret", "is_editable": true }
  ],
  "learn": [
    { "key": "outline.url", "value": "https://wiki.example.com", "value_type": "string", "is_editable": true }
  ]
}
```

### Config Update Request

```json
PATCH /api/admin/config/auth.local_login_enabled/
{ "value": false }
```

### Key DB Table

```sql
-- system_config: key (PK), value JSONB, value_type config_type,
--                category, description, is_runtime, is_editable
```

---

## Acceptance Criteria

### AC-CFG-01: Startup Seed
```
Given: Fresh database với không có system_config rows
When: Django server khởi động
Then: Tất cả predefined config keys được tạo với default values
  And: Không có key nào bị trùng hoặc ghi đè
```

### AC-CFG-02: Update Bool Config
```
Given: auth.local_login_enabled = true
When: PATCH /api/admin/config/auth.local_login_enabled/ với {"value": false}
Then: Response 200 với updated value
  And: Ngay sau đó POST /api/auth/login/ trả 403
```

### AC-CFG-03: Type Validation
```
Given: auth.email.port is type=int
When: PATCH với {"value": "not-a-number"}
Then: Response 400 "Value must be an integer"
```

### AC-CFG-04: Secret Masking
```
Given: auth.sso_client_secret có giá trị thực
When: GET /api/admin/config/auth.sso_client_secret/
Then: Response {"value": "***"} (không trả giá trị thực)
```

### AC-CFG-04b: Secret Visible for Privileged Operator
```
Given: user có permission thủ công "system.config.view_secret"
When: GET /api/admin/config/auth.sso_client_secret/
Then: Response có clear value phục vụ cấu hình vận hành
```

### AC-CFG-05: Non-Editable Config
```
Given: A config key with is_editable=False
When: PATCH /api/admin/config/{key}/
Then: Response 403 "Config is not editable"
```

### AC-CFG-06: Dynamic Config Read
```
Given: outline.url = "https://old.wiki.com"
When: Admin cập nhật outline.url = "https://new.wiki.com"
  And: Editor ngay sau đó fetch Outline documents
Then: Outline integration dùng URL mới mà không cần restart
```
