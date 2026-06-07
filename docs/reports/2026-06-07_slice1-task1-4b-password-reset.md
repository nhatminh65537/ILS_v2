# Session Report: Password Reset (Task 1.4B) + Change Password Frontend

**Date:** 2026-06-07
**Slices / Areas:** Slice 1 — Authentication (Task 1.4B password reset BE+FE; change-password FE wiring)

## Summary

Implemented the previously-deferred password-reset flow (Task 1.4B) end-to-end and
wired the already-built change-password backend into the frontend. Password reset
uses stateless `itsdangerous` tokens (R-AUTH-02, 1-hour expiry, no DB), an
anti-enumeration request endpoint, per-email rate limiting, and a new `EmailService`
that resolves SMTP from env → `auth.email.*` config → console fallback. The
frontend now has working forgot-password / reset-password pages and a change-password
form in profile settings (replacing the old "coming soon" placeholder), all localized
in English and Vietnamese.

## Completed Items

- Shared `validate_password_policy` helper extracted; change-password serializer refactored to use it.
- Reset constants (cache key, 3/hour rate limit, token max-age, signer salt).
- `PasswordResetService` (sign/verify stateless token, build reset link).
- `EmailService` (dynamic backend per send: env → config → console; never raises).
- `PasswordResetRequestSerializer` + `PasswordResetConfirmSerializer`.
- `PasswordResetRequestView` + `PasswordResetConfirmView` + URL routes.
- `DJANGO_SECRET_KEY` and `FRONTEND_URL` wired from env in `settings.py`; `.env.example` email section.
- Backend test suite `test_password_reset.py` (11 cases); full `auth_app` suite green.
- FE service fns (`changePassword`, `requestPasswordReset`, `confirmPasswordReset`) + types.
- `ChangePasswordForm` + wired into `ProfileSettingsView`.
- `ForgotPasswordForm` / `ResetPasswordForm` + the two `(auth)` pages + login "Forgot password?" link.
- i18n keys (en + vi) + `auth-error-map` branches; `tsc` + `eslint` clean.
- Docs propagated: API.md, IMPL_PLAN.md, DECISIONS.md (Q-INFRA-03 + R-AUTH-02), CONFIG.md, STATUS.md.

## Key Implementations

### Password reset request (anti-enumeration)

1. Reject early with 403 if `auth.password_reset_enabled` or `auth.local_login_enabled` is off.
2. Validate `{email}`; lowercase it.
3. Fixed-window per-email rate limit (`pwreset_req:{email}`, 3/hour) applied **before** the user lookup so the limiter can't be used as an existence oracle (429 when exceeded).
4. Look up active user by `email__iexact`; only send mail when the user exists **and** has a non-blank usable password (SSO-only accounts have `password=''` which Django still reports as "usable", so the view checks `has_usable_password() and user.password`).
5. Generate signed token, build the FE reset link, send via `EmailService` (result ignored).
6. **Always** return 200 with a fixed generic detail, identical for existing and non-existing emails.

### Stateless, single-use reset token (R-AUTH-02)

1. `TimestampSigner(SECRET_KEY, salt='auth.password-reset')`, built per call.
2. `generate_token` signs `"{pk}:{fingerprint}"` where `fingerprint = HMAC(SECRET_KEY, user.password)[:16]`.
3. `verify_token` unsigns with `max_age=3600`; `SignatureExpired`/`BadSignature` → `None`; splits the payload, resolves an active user by id, then recomputes the fingerprint and `hmac.compare_digest`-checks it against the user's current password hash.
4. No DB row, yet **single-use**: any password change (reset/normal change/admin reset) alters `user.password` → fingerprint mismatch → token dies. Same idea as Django's `PasswordResetTokenGenerator`. SECRET_KEY read from env so tokens survive restarts.

> **Note (post-review):** an earlier iteration this session used a `pk`-only payload, which made tokens replayable within the 1h window. That was upgraded to the fingerprint-bound single-use scheme above at the user's request.

### EmailService dynamic backend

1. `_resolve_smtp_settings` reads each field from env first, then `auth.email.*` config; returns `None` when no host resolves.
2. `_build_connection` → console backend when `None`, else SMTP backend built with the resolved host/port/credentials/TLS (fresh per send, since config is runtime-editable).
3. `send_password_reset_email` composes a text+HTML message and wraps `.send()` in try/except — logs and returns `False` on failure so an SMTP outage never 500s the request.

### Reset confirm

1. 403 if `auth.password_reset_enabled` off.
2. Validate `{token, new_password}` (policy enforced via shared helper).
3. `verify_token` → 400 if invalid/expired.
4. `set_password` + save, then `SessionService.revoke_all_user_sessions` (invalidates the session-active cache), returning `revoked_count`.

### Frontend forced re-login

Change-password and reset-confirm both revoke all sessions server-side. `ChangePasswordForm` mirrors `AccountForm`'s precedent: `clearAuth()` then `window.location.assign('/{locale}/login')` (hard nav to dodge the GuestOnlyGate race).

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/validators.py` | **New** — shared `validate_password_policy`. |
| `backend/auth_app/serializers.py` | Refactor change serializer to helper; add reset request/confirm serializers. |
| `backend/auth_app/constants.py` | Add reset cache key, rate-limit, token max-age, signer salt. |
| `backend/auth_app/services/password_reset_service.py` | **New** — stateless token service. |
| `backend/auth_app/services/email_service.py` | **New** — dynamic email backend. |
| `backend/auth_app/views.py` | Add `PasswordResetRequestView` / `PasswordResetConfirmView` (+ imports). |
| `backend/auth_app/urls.py` | Add `password/reset/` and `password/reset/confirm/` routes. |
| `backend/backend/settings.py` | Read `DJANGO_SECRET_KEY` from env; add `FRONTEND_URL`. |
| `.env.example` | Add `FRONTEND_URL` + email/SMTP section. |
| `backend/auth_app/tests/test_password_reset.py` | **New** — 11 test cases. |
| `frontend/src/types/user.types.ts` | New payload/response types. |
| `frontend/src/services/auth.service.ts` | `changePassword`, `requestPasswordReset`, `confirmPasswordReset`. |
| `frontend/src/components/features/profile/ChangePasswordForm.tsx` | **New**. |
| `frontend/src/components/features/profile/ProfileSettingsView.tsx` | Replace placeholder card with `ChangePasswordForm`. |
| `frontend/src/components/features/auth/ForgotPasswordForm.tsx` | **New**. |
| `frontend/src/components/features/auth/ResetPasswordForm.tsx` | **New**. |
| `frontend/app/[locale]/(auth)/forgot-password/page.tsx` | Replace stub with real page. |
| `frontend/app/[locale]/(auth)/reset-password/page.tsx` | Replace stub (Suspense-wrapped form). |
| `frontend/app/[locale]/(auth)/login/page.tsx` | Add "Forgot password?" link. |
| `frontend/src/lib/auth-error-map.ts` | Map current-password/reset-token/reset-disabled errors. |
| `frontend/messages/en.json`, `vi.json` | New auth + profile keys; removed `passwordPending`. |
| `docs/API.md`, `IMPL_PLAN.md`, `DECISIONS.md`, `CONFIG.md`, `STATUS.md` | Propagated status + behavior. |

## Notes / Caveats

- **Single-use tokens:** the payload embeds an HMAC fingerprint of the current password hash, so a confirmed (or otherwise password-changed) token no longer verifies. Stateless, still no DB row.
- **SECRET_KEY rotation** intentionally invalidates all outstanding reset links.
- **SSO-only users** (`password=''`) are silently skipped — `has_usable_password()` alone is insufficient (Django treats empty string as usable), so the view also checks `user.password` is non-blank.
- **Change-password wrong-password 401** triggers one extra token refresh in the axios interceptor before surfacing the error (the endpoint isn't in the refresh skip-list). Behavior is still correct; left as-is to avoid breaking legit token refresh on the profile page.
- **Dev verification without SMTP:** leave `EMAIL_HOST` empty → reset links print to the Django console.
