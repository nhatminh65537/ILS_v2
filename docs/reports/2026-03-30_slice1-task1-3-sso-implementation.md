# 2026-03-30 — Slice 1 / Task 1.3 SSO (Authentik OIDC) Implementation Report

## Scope
- Implement backend-first SSO/AuthentiK OIDC flow for Slice 1 Task 1.3.
- Add account linking endpoint for authenticated users.
- Keep frontend callback redirect/persistence flow deferred.

## Implemented

### 1) Service Layer
- Added `backend/auth_app/services/sso_service.py`.
- Implemented `AuthentikSSOService` with:
  - `oidc_discovery()`
  - `get_redirect_url(callback_url)`
  - `handle_callback(code, state, callback_url, device_info)`
  - `link_identity(user, provider, external_id, ...)`
- Added custom exceptions:
  - `SSOConfigError`
  - `SSOAuthError`
  - `SSOLinkError`

### 2) API Endpoints
- Added endpoints in `backend/auth_app/urls.py`:
  - `GET /api/auth/sso/redirect/`
  - `GET /api/auth/sso/callback/`
  - `POST /api/auth/identity/link/`
- Added corresponding views in `backend/auth_app/views.py`:
  - `SSORedirectView`
  - `SSOCallbackView`
  - `IdentityLinkView`

### 3) Serializers
- Added in `backend/auth_app/serializers.py`:
  - `SSOCallbackQuerySerializer`
  - `IdentityLinkRequestSerializer`

### 4) Test Coverage
- Extended `backend/auth_app/tests.py` with SSO/linking tests:
  - Redirect URL generation and redirect response
  - Callback success for new SSO user
  - Callback success for existing local user auto-link by email
  - Invalid state rejection
  - SSO disabled rejection
  - Identity link idempotency for same user/external_id
  - Identity link conflict when external_id belongs to another user
- OIDC interactions are mock-driven for deterministic CI testing.

## Security Notes
- Implemented state+nonce anti-replay with cache key `sso:state:{state}` and TTL 300s.
- Callback consumes state once (delete after read).
- Linking policy:
  - Resolve by `(provider, external_id)` first
  - Fallback to email-based linking when `auth.link_accounts_enabled=true`
  - Conflict on cross-user external identity
- Current `id_token` decoding is non-signature-verified for MVP flow completion; production hardening should add JWKS signature + issuer/audience checks.

## Documentation Sync
- Updated `docs/API.md` to mark SSO endpoints active.
- Updated `docs/STATUS.md` to mark Slice 1 Task 1.3 completed.
- Updated `docs/IMPL_PLAN.md` with completion and implementation details.
- Updated `openmemory.md` with SSO implementation and patterns.

## Verification
- Test command:
  - `d:\PBL5\ILS_v2\.venv\Scripts\python.exe -m pytest auth_app/tests.py`
- Result:
  - `22 passed`

## Changed Files
- `backend/auth_app/services/sso_service.py` (new)
- `backend/auth_app/views.py`
- `backend/auth_app/serializers.py`
- `backend/auth_app/urls.py`
- `backend/auth_app/tests.py`
- `docs/API.md`
- `docs/STATUS.md`
- `docs/IMPL_PLAN.md`
- `openmemory.md`
