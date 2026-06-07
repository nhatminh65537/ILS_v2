# CONFIG.md — ILS v2 System Configuration Reference

> Runtime configuration stored in the `system_config` table. All values can be updated via
> `PATCH /api/admin/config/{key}/` without restarting the server.
>
> See `docs/prd/10-system-config.md` for API spec and acceptance criteria.

---

## Schema Overview

| Field | DB Column | Description |
|-------|-----------|-------------|
| **key** | `key VARCHAR(150) PK` | Dot-separated key, e.g. `auth.local_login_enabled` |
| **value** | `value JSONB` | Stored as JSONB; type enforced by `value_type` |
| **value_type** | `config_type ENUM` | `bool` / `int` / `string` / `secret` / `json` |
| **category** | `category VARCHAR(50)` | First segment of the key, used for grouping |
| **is_editable** | `BOOLEAN` | `false` = system-managed, API updates rejected with 403 |
| **is_runtime** | `BOOLEAN` | `true` = re-read from DB on every access (no process cache) |
| **description** | `TEXT` | Human-readable description |

### Value Types

| Type | Storage | API Read | API Write | Notes |
|------|---------|----------|-----------|-------|
| `bool` | `true`/`false` JSON boolean | value | `true` or `false` only | |
| `int` | JSON number | value | numeric string or integer | |
| `string` | JSON string | value | any string | |
| `secret` | encrypted JSON string | masked by default | any string | Encrypted at rest; clear value requires explicit permission |

### Secret Visibility Policy

- Default behavior: `secret` values are masked (`"***"`) in list/detail responses.
- Clear secret value is returned only to users with manually seeded permission `system.config.view_secret`.
- This permission is intentionally manual (not endpoint-scan generated) and is granted only to trusted operators.
- Secret update does not require secret readback: callers can write a new value without seeing the old one.
| `json` | JSONB object | value | valid JSON object | Only for complex multi-field configs |

---

## Config Catalog

### `auth` — Authentication Methods

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `auth.local_login_enabled` | bool | `true` | ✅ | ✅ | `true` | Enable native username/password login. Set to `false` to force SSO-only. |
| `auth.registration_enabled` | bool | `true` | ✅ | ✅ | `false` | Allow new users to self-register via the local sign-up form. Disable for invite-only orgs. |
| `auth.password_reset_enabled` | bool | `true` | ✅ | ✅ | `true` | Allow users to request a password reset email. Requires SMTP configured. |
| | | | | | | > **Note:** Reserved — backend password reset endpoint not yet implemented (frontend page is a "Coming soon" stub). Honor this flag when the feature is built. |
| `auth.sso_enabled` | bool | `false` | ✅ | ✅ | `true` | Enable SSO login via Authentik (OAuth2). |
| `auth.sso_base_url` | string | `""` | ✅ | ❌ | `"https://auth.example.com"` | Authentik instance base URL (no trailing slash). |
| `auth.sso_client_id` | string | `""` | ✅ | ❌ | `"ils-app"` | OAuth2 client ID registered in Authentik. |
| `auth.sso_client_secret` | secret | `""` | ✅ | ❌ | `"<client-secret>"` | OAuth2 client secret registered in Authentik. Stored encrypted. |
| `auth.link_accounts_enabled` | bool | `true` | ✅ | ✅ | `true` | Allow users to link an SSO identity to an existing local account (and vice versa). |
| `auth.authorization_enabled` | bool | `true` | ✅ | ✅ | `false` | Enable RBAC permission checks on API endpoints. When `false`, all authenticated users bypass permission checks (treated as having all permissions). **Dev-only toggle** — must be `true` in production. |

> **Note:** Both `auth.local_login_enabled` and `auth.sso_enabled` can be `true` simultaneously.
> Setting both to `false` will lock all users out — the API will guard against this and reject the second disable.
>
> **Note:** `auth.authorization_enabled=false` disables RBAC permission checks entirely — all authenticated
> users can access all endpoints regardless of role. This is intended **only for development/testing** to
> allow working on features (Learn, Challenge, Quiz, etc.) before RBAC is fully implemented. **Never
> deploy to production with this set to `false`.**

---

### `auth.password` — Password Policy

Validated on registration and password change. Does not retroactively enforce on existing passwords.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `auth.password.min_length` | int | `8` | ✅ | ✅ | `12` | Minimum password length in characters. |
| `auth.password.require_uppercase` | bool | `false` | ✅ | ✅ | `true` | Require at least one uppercase letter (A–Z). |
| `auth.password.require_number` | bool | `false` | ✅ | ✅ | `true` | Require at least one digit (0–9). |
| `auth.password.require_special` | bool | `false` | ✅ | ✅ | `false` | Require at least one special character (e.g. `!@#$%^&*`). |

---

### `auth.email` — SMTP / Email

Used for password reset emails and future notification emails. All fields are optional until password reset is enabled.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `auth.email.host` | string | `""` | ✅ | ❌ | `"smtp.gmail.com"` | SMTP server hostname. |
| `auth.email.port` | int | `587` | ✅ | ❌ | `587` | SMTP server port. Common values: 25, 465 (SSL), 587 (STARTTLS). |
| `auth.email.use_tls` | bool | `true` | ✅ | ❌ | `true` | Use STARTTLS when connecting to SMTP server. Set `false` for plain port 25 or implicit SSL on 465. |
| `auth.email.username` | string | `""` | ✅ | ❌ | `"noreply@example.com"` | SMTP authentication username. |
| `auth.email.password` | secret | `""` | ✅ | ❌ | `"<smtp-password>"` | SMTP authentication password. Stored encrypted. |
| `auth.email.sender_name` | string | `"ILS Platform"` | ✅ | ❌ | `"Cybersec Team"` | Display name in the From field of outgoing emails. |
| `auth.email.sender_address` | string | `""` | ✅ | ❌ | `"noreply@example.com"` | From email address. Combined with `sender_name` as `"ILS Platform <noreply@example.com>"`. |

> **Why individual fields instead of a JSON blob?** Each field has its own type and validation rule. Splitting them allows type-safe validation per field and selective update (e.g., change only the password without resending the hostname).

---

### `auth.token` — JWT Token Lifetimes

Changes apply to **newly issued tokens only**. Existing tokens retain their original expiry.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `auth.token.access_ttl` | int | `15` | ✅ | ✅ | `30` | Access token TTL in **minutes**. Short-lived; encoded with permission claims. |
| `auth.token.refresh_ttl` | int | `10080` | ✅ | ✅ | `43200` | Refresh token TTL in **minutes**. Default = 7 days (10080). Max recommended = 30 days (43200). |

---

### `learn` — Course / Lesson Behavior

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `learn.max_tree_depth` | int | `5` | ✅ | ✅ | `5` | Maximum folder nesting depth in a course tree. Enforced on node create. Root = depth 0. |
| `learn.max_nodes_per_course` | int | `500` | ✅ | ✅ | `500` | Maximum total nodes (folders + lessons) per course. Prevents runaway content trees. |

---

### `outline` — Outline Integration

[Outline](https://github.com/outline/outline) is a self-hosted wiki used as the lesson content editor and storage backend.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `outline.enabled` | bool | `false` | ✅ | ✅ | `true` | Enable Outline integration. When disabled, editors cannot import lessons from Outline. |
| `outline.url` | string | `""` | ✅ | ❌ | `"https://wiki.example.com"` | Outline instance base URL (no trailing slash). Used as prefix for all Outline API calls. |
| `outline.api_token` | secret | `""` | ✅ | ❌ | `"<outline-api-token>"` | Outline API token. Generate in Outline → Settings → API. Stored encrypted. |

> **Why no `outline.username`/`outline.password`?** Outline's REST API authenticates exclusively via Bearer token. Username/password is not supported by the Outline API.
>
> **Integration rule:** Frontend does not call Outline directly. Backend calls Outline and returns normalized lesson content to frontend.

---

### `challenge` — Challenge General Settings

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `challenge.upload_path` | string | `"uploads/challenges"` | ✅ | ❌ | `"/var/ils/uploads/challenges"` | Filesystem path for manually uploaded challenge attachment files. Relative to Django `MEDIA_ROOT` or absolute. |
| `challenge.instance_ttl_minutes` | int | `60` | ✅ | ✅ | `120` | How long a deployed challenge instance lives before the deploy server auto-tears it down. Also the increment added on each extend. |
| `challenge.instance_extend_threshold_minutes` | int | `10` | ✅ | ✅ | `15` | A user may only extend a running instance when its remaining time is below this threshold (minutes). Naturally rate-limits extend spam. |

---

### `challenge.deploy` — Instance Deployment Integration

Deployable challenges allow each user to spin up their own isolated instance (e.g., a Docker container with a vulnerable service).

ILS never spawns containers (REQUIREMENTS §2.4, DECISIONS R-ARCH-12). It sends commands to an external **deploy server** over a TCP socket; the deploy server owns Docker. Switching from mock to real deployment is a `provider` flip — no code/serializer/frontend change. Wire contract: `docs/integrations/deploy-socket-protocol.md`.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `challenge.deploy.enabled` | bool | `false` | ✅ | ✅ | `true` | Enable the deployable challenge feature. When disabled, `instance/start` returns 403 (AC-CHAL-07). |
| `challenge.deploy.provider` | string | `"mock"` | ✅ | ✅ | `"socket"` | Deployment backend: `mock` (fake connection info, no container) or `socket` (talk to the real deploy server). |
| `challenge.deploy.api_url` | string | `""` | ✅ | ✅ | `"localhost:9100"` | Deploy-server address as `host:port`. Used only when `provider=socket`. The deploy server binds privately and has **no auth** — keep it off the public internet. |

> **Removed:** `challenge.deploy.api_token` — the deploy server has no auth in this phase (it binds to a private interface only). The key is no longer seeded; any pre-existing row is unused.

---

### `challenge.git` — GitLab Integration

GitLab is used to sync challenge metadata, README, and source files. Each CTF challenge maps to one GitLab project.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `challenge.git.enabled` | bool | `false` | ✅ | ✅ | `true` | Enable GitLab challenge import and sync. |
| `challenge.git.url` | string | `""` | ✅ | ❌ | `"https://gitlab.example.com"` | GitLab instance base URL (no trailing slash). |
| `challenge.git.token` | secret | `""` | ✅ | ❌ | `"glpat-xxxxxxxxxxxx"` | GitLab access token with `read_api` and `read_repository` scopes. Stored encrypted. Either a **Personal Access Token** or a **Group Access Token** works; a read-only Group Access Token scoped to the CTF group is recommended (least privilege, no human account tied to it). Sent server-side as the `PRIVATE-TOKEN` header — never exposed to the frontend. |

> **Why no `username`/`password`?** GitLab deprecated HTTP basic auth for API access (removed in GitLab 15.0). Personal access tokens (PAT) are the correct authentication method for GitLab API v4. For git clone over HTTPS, use `oauth2:<token>@gitlab.example.com/...` format with the PAT.

> **Group Access Token (recommended).** In GitLab: *Group → Settings → Access Tokens* → role `Reporter`, scopes `read_api` + `read_repository`. This token can read every project in the group, so a single token covers all CTF challenges without being bound to a person. The server-mediated `GitlabService` (Task 6.8) uses it for project browse, README/file download, and sync.

> **Sourced from `.env` (like Outline).** `seed_config` reads `GITLAB_URL` + `GITLAB_TOKEN` from the environment (`.env`, loaded by `settings.py`); when both are present it fills `challenge.git.url` / `challenge.git.token` and sets `challenge.git.enabled=true`. On re-seed, a non-empty existing value is never clobbered by an empty env default. This keeps the token out of the repo — mirror of `OUTLINE_URL`/`OUTLINE_API_TOKEN`. See `.env.example`.

> **Media storage (Task 6.8).** Downloaded/uploaded attachment files are stored on the local filesystem under `MEDIA_ROOT` (`backend/media/`, see `settings.py`) at `challenges/<slug>/<filename>` and served through permission-gated API endpoints, not a config key. In dev, `MEDIA_URL=/media/` is served by Django (`DEBUG` only); production must map it via the vhost/CDN.

---

### `ai` — AI Assistant

> ⚠️ **DEFERRED — Slice 10 (AI Assistant) is deferred (see `docs/STATUS.md`). These keys are documented but NOT seeded in `seed_config.py`. They will be added to the seed when Slice 10 is approved for implementation.**

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `ai.enabled` | bool | `false` | ✅ | ✅ | `true` | Enable the AI assistant feature (learn_assistant, editor_assistant, learning_path modes). |
| `ai.provider` | string | `"openai"` | ✅ | ❌ | `"anthropic"` | LLM provider identifier. Supported values: `openai`, `anthropic`. |
| `ai.model` | string | `"gpt-4o-mini"` | ✅ | ❌ | `"claude-haiku-4-5-20251001"` | Model name passed to the provider API. Must match provider's model catalog. |
| `ai.api_key` | secret | `""` | ✅ | ❌ | `"sk-..."` | API key for the LLM provider. Stored encrypted. |
| `ai.base_url` | string | `""` | ✅ | ❌ | `"https://llm-proxy.example.com/v1"` | Custom base URL override (for self-hosted proxies or Azure OpenAI endpoint). Leave empty to use provider default. |
| `ai.rate_limit_per_hour` | int | `20` | ✅ | ✅ | `50` | Maximum AI requests per user per hour. Prevents cost abuse. |

---

### `cdn` — CDN / Static Asset Delivery

Optional CDN for serving uploaded challenge files and course media assets.

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `cdn.enabled` | bool | `false` | ✅ | ✅ | `true` | Enable CDN for media/static assets. When disabled, files served directly from Django `MEDIA_URL`. |
| `cdn.endpoint` | string | `""` | ✅ | ❌ | `"https://cdn.example.com"` | CDN base URL. All asset URLs will be prefixed with this endpoint. |
| `cdn.auth_token` | secret | `""` | ✅ | ❌ | `"<cdn-token>"` | CDN authentication token (for signed URL generation or CDN API access). Stored encrypted. |

---

### `system` — System-Level Settings

| Key | Type | Default | Editable | Runtime | Example | Description |
|-----|------|---------|----------|---------|---------|-------------|
| `system.maintenance_mode` | bool | `false` | ✅ | ✅ | `true` | Put system in maintenance mode. All non-admin requests receive 503. Admins can still access APIs. |
| `system.rate_limit.login` | int | `10` | ✅ | ✅ | `5` | Max login attempts per minute per IP address. Brute-force protection. |
| `system.rate_limit.api` | int | `120` | ✅ | ✅ | `60` | Max general API requests per minute per authenticated user. |
| `system.rate_limit.flag_submit` | int | `10` | ✅ | ✅ | `5` | Max flag submission attempts per minute per user. Prevents automated flag brute-forcing. |

---

## Changes from Initial Proposal

The following changes were made relative to the initial config list:

| Change | Original | Final | Reason |
|--------|----------|-------|--------|
| Renamed | `auth.enable_local_login` | `auth.local_login_enabled` | Consistent `*_enabled` suffix across all boolean feature toggles |
| Renamed | `auth.enable_registration` | `auth.registration_enabled` | Same suffix convention |
| Renamed | `auth.enable_password_reset` | `auth.password_reset_enabled` | Same suffix convention |
| Renamed | `auth.enable_sso` | `auth.sso_enabled` | Same suffix convention |
| Replaced | `auth.email.smtp` (json) | Individual `auth.email.*` fields | JSON blob prevents per-field type validation and selective update |
| Added | — | `auth.email.use_tls`, `auth.email.username` | Required SMTP fields missing from original |
| Renamed | `course.max_tree_depth` | `learn.max_tree_depth` | `learn` category matches PRD and feature terminology |
| Renamed | `course.max_nodes_per_course` | `learn.max_nodes_per_course` | Same category rename |
| Moved + Renamed | `course.outline.*` | `outline.*` | Outline is a standalone integration, not scoped to course only |
| Renamed | `course.outline.token_enabled` | `outline.enabled` | Toggle for the whole integration, not just the token |
| Renamed | `course.outline.token` | `outline.api_token` | Clarifies it's an API token (not git token) |
| Removed | `course.outline.username`, `course.outline.password` | — | Outline API uses token-only auth; basic auth not supported |
| Renamed | `challenge.deployable.enabled` | `challenge.deploy.enabled` | Shortened; matches new `challenge.deploy.*` sub-group |
| Removed | `challenge.git.token_enabled` | — | Redundant: a non-empty token implies enabled |
| Removed | `challenge.git.username`, `challenge.git.password` | — | GitLab deprecated HTTP basic auth for API (removed v15.0); PAT tokens are correct |
| Added | — | `auth.sso_base_url`, `auth.sso_client_id`, `auth.sso_client_secret` | Required for Authentik OAuth2 flow (missing from proposal) |
| Added | — | `auth.link_accounts_enabled` | Required for SSO↔local account linking feature |
| Added | — | `challenge.deploy.api_url`, `challenge.deploy.api_token` | Required fields for deploy server integration |
| Added | — | `challenge.instance_ttl_minutes` | Controls instance lifetime; moved from challenge general |
| Added | — | `ai.*` group (6 keys) | Entire AI assistant config group missing from proposal |
| Added | — | `cdn.enabled` | Toggle flag for CDN; avoids partially-configured CDN being active |
| Added | — | `system.maintenance_mode` | Standard self-hosted platform operational config |
| Removed | `permission_version` | — | Global permission version replaced by per-user `permission_version` field on user model; no system_config entry needed |

---

## Startup Seed Behavior

On Django startup (`AppConfig.ready()`), all keys in this document are seeded with their default values using `INSERT ... ON CONFLICT DO NOTHING`. Existing values are **never overwritten**.



---

## Security Notes

- **`secret` values** are encrypted using AES with a key derived from Django's `SECRET_KEY`. Changing `SECRET_KEY` in production will make all stored secrets unreadable — rotate secrets explicitly before changing `SECRET_KEY`.
- **GET responses** for `secret` keys are masked by default. Users with `system.config.view_secret` may request/read clear values for operational setup.

- Rate-limit configs (`system.rate_limit.*`) are `is_runtime=true` — changes take effect immediately without restart.
