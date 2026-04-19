# Session Report: Admin Surface Token Guard

**Date:** 2026-04-19
**Slices / Areas:** Auth / Frontend admin surface / Bugfix

## Summary

Replaced the temporary auth-only admin route guard with a stable JWT claim-based gate. Backend tokens now carry an `admin_surface` claim for Admin and Editor users, and the frontend admin surface uses that claim to deny member accounts at route level and at admin-login time. This closes the frontend authorization bypass and stabilizes `/admin/users` access for valid admin-surface accounts without reintroducing permission-catalog coupling.

## Completed Items

- Added `admin_surface` JWT claim issuance in backend token service.
- Added auth regression tests for member vs editor admin-surface claims.
- Updated frontend admin guard to use JWT claim decoding instead of auth-only gating.
- Updated admin login UX to reject non-admin-surface accounts immediately.
- Updated MSW mock token generation and locale messages with the new contract.
- Updated `docs/BUGS.md`, `docs/STATUS.md`, and `openmemory.md`.

## Key Implementations

### JWT Admin Surface Claim

1. Backend `TokenService` computes whether a user belongs to built-in `Admin` or `Editor` roles.
2. Token issuance writes `admin_surface` into both refresh and access tokens.
3. Regression tests assert members receive `False` and editor-role users receive `True`.

### Frontend Admin Gate

1. `AdminAccessGate` decodes the JWT payload and reads `admin_surface`.
2. Unauthenticated users are redirected to `/{locale}/admin/login`.
3. Authenticated users without `admin_surface` are redirected to `/{locale}/dashboard`.
4. Valid admin-surface users keep the original route and render normally.

### Admin Login Rejection Flow

1. Admin login still uses the normal auth endpoint.
2. After login, the page immediately validates the new access token claim.
3. If `admin_surface` is missing, auth state is cleared and a localized access-denied message is shown.
4. Only valid admin-surface accounts proceed to `/{locale}/admin/dashboard`.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/auth_app/services/token_service.py` | Added `admin_surface` JWT claim generation from built-in role membership. |
| `backend/auth_app/tests/test_auth_api.py` | Added regression coverage for member/editor token claim behavior. |
| `frontend/src/lib/rbac-claim.ts` | Added JWT helper to read `admin_surface`. |
| `frontend/src/components/layouts/AdminAccessGate.tsx` | Switched admin route guard from auth-only to claim-based gating. |
| `frontend/src/components/features/auth/AdminLoginForm.tsx` | Rejected non-admin-surface accounts immediately after admin login. |
| `frontend/src/mocks/handlers/admin-permissions.ts` | Added `admin_surface` to mock access tokens. |
| `frontend/messages/en.json` | Added localized admin access-denied message. |
| `frontend/messages/vi.json` | Added localized admin access-denied message. |
| `docs/BUGS.md` | Closed H3/H7 as fixed history. |
| `docs/STATUS.md` | Added bugfix status entry and report evidence entry. |
| `openmemory.md` | Recorded the new admin-surface token-gate pattern and status update. |

## Notes / Caveats

- This fix intentionally uses a coarse admin-surface claim, not a full per-page capability model.
- Frontend still has some hardcoded capability helpers in RBAC/config areas; that broader BE-first authz cleanup remains tracked as `L5`.
- Focused verification passed with `pytest auth_app/tests/test_auth_api.py`, `npm run lint`, and `npx tsc --noEmit`. Frontend production build in this environment still has an unrelated Google Fonts network dependency issue.
