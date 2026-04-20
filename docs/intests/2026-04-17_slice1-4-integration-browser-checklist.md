# Integration Browser Checklist - Slices 1-4 (DEV-first)

> Scope: Slice 1 (Auth), Slice 2 (RBAC), Slice 3 (System Config), Slice 4 (Frontend Foundation)
> Environment: local DEV only
> Last updated: 2026-04-20

---

## 1. Environment Preconditions

- **PRE-001**: Backend URL is `http://localhost:8000`.
- **PRE-002**: Frontend URL is `http://localhost:4000`.
- **PRE-003**: Frontend must run with real backend API (MSW disabled).
- **PRE-004**: Use two terminal sessions minimum: backend + frontend.

### PRE Commands

```bash
# Terminal A - Backend
cd backend
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
daphne -p 8000 backend.asgi:application

# Terminal B - Frontend
cd frontend
# Ensure .env.local includes API URL to local backend and MSW disabled
npm run build
npm run start
```

Expected result:
- Backend health endpoints respond at port 8000.
- Frontend renders login page at `/vi/login`.

---

## 2. Database Setup (Deterministic)

- **DB-001**: Reset DB to a clean state.
- **DB-002**: Apply latest migrations.
- **DB-003**: Seed core config and built-in roles.
- **DB-004**: Create deterministic users and role mapping.

### DB Commands

```bash
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
python manage.py shell -c "
from django.contrib.auth import get_user_model
from api.models import Role, UserRole
User = get_user_model()

admin = User.objects.create_superuser('admin', 'admin@test.local', 'admin1234')
editor = User.objects.create_user('editor1', 'editor@test.local', 'editor1234')
member = User.objects.create_user('member1', 'member1@test.local', 'member1234')

UserRole.objects.create(user=admin, role=Role.objects.get(name='Admin'))
UserRole.objects.create(user=editor, role=Role.objects.get(name='Editor'))
UserRole.objects.create(user=member, role=Role.objects.get(name='Member'))
print('seed ok')
"
```

Expected result:
- Users exist: `admin`, `editor1`, `member1`.
- Role bindings exist and are unique.

---

## 3. Browser Checklist Cases

### Slice 1 - Authentication

- [ ] **BRW-101**: Open `/vi/register`; registration form fields render (username/password/confirm).
- [ ] **BRW-102**: Submit register with invalid confirm password; validation message renders and no navigation.
- [ ] **BRW-103**: Open `/vi/login`; login form renders and accepts credentials.
- [ ] **BRW-104**: Login with `member1/member1234`; browser navigates away from login and token is persisted.
- [ ] **BRW-105**: Reload page after login; token still exists in local storage.
- [ ] **BRW-106**: Login with invalid password; error state renders and user remains on login page.

### Slice 2 - RBAC (Admin Surface)

- [ ] **BRW-201**: Login as `admin`; open `/vi/admin/rbac`; role and permission content is visible.
- [ ] **BRW-202**: Login as `member1`; open `/vi/admin/rbac`; restricted behavior occurs (redirect, forbidden message, or blocked action).
- [ ] **BRW-203**: Login as `editor1`; open `/vi/admin/rbac`; verify behavior matches current permission policy.
- [ ] **BRW-204**: On admin RBAC page, role mutation controls are visible only for allowed role.

### Slice 3 - System Config (Admin Surface)

- [ ] **BRW-301**: Login as `admin`; open `/vi/admin/config`; grouped config list renders.
- [ ] **BRW-302**: Edit one editable non-secret key; save success feedback appears.
- [ ] **BRW-303**: Attempt edit of non-editable key; update is blocked with deterministic message.
- [ ] **BRW-304**: Secret-type keys remain masked in list view.
- [ ] **BRW-305**: If secret update flow exists, confirmation step appears before submission.

### Slice 4 - Frontend Foundation Smoke

- [ ] **BRW-401**: Locale routes `/vi/login` and `/en/login` both render correctly.
- [ ] **BRW-402**: Navigation shell (header/sidebar) renders consistently after authenticated navigation.
- [ ] **BRW-403**: Protected route without auth redirects to login route.
- [ ] **BRW-404**: Session continuity check: refresh in protected area does not immediately lose authenticated state.

---

## 4. API Cross-check and Logs

- **API-001**: Confirm frontend requests target backend host `localhost:8000` (no mock intercept behavior).
- **API-002**: During BRW-201 and BRW-301, verify API responses are successful and payload shape is valid for UI rendering.
- **API-003**: Record any 401/403/500 responses with endpoint and case ID.

---

## 5. Result Matrix

| Case ID | Status (PASS/FAIL/BLOCKED) | Notes | Owner |
|---------|-----------------------------|-------|-------|
| BRW-101 | PASS | Playwright test 1 passed: registration form rendered. | Copilot |
| BRW-102 | PASS | Supplemental Playwright case passed: password mismatch showed validation and stayed on register route. | Copilot |
| BRW-103 | PASS | Playwright test 2 passed: login form rendered. | Copilot |
| BRW-104 | PASS | Supplemental Playwright case passed after auth persistence + redirect timing fixes; member login navigated away from login and token was stored. | Codex |
| BRW-105 | PASS | Integration Playwright token persistence case passed after reload on real backend. | Codex |
| BRW-106 | PASS | Supplemental Playwright case passed: invalid login stayed on login route and showed error. | Copilot |
| BRW-201 | PASS | Playwright test 5 passed: admin RBAC page loaded with content. | Copilot |
| BRW-202 | PASS | Member access to `/vi/admin/rbac` is blocked by admin-surface token gate and verified in browser. | Codex |
| BRW-203 | PASS | Supplemental Playwright case passed: editor RBAC route rendered role/permission or read-only hint. | Copilot |
| BRW-204 | PASS | Admin sees create-role control while editor does not; browser verification passed on real backend. | Codex |
| BRW-301 | PASS | Playwright test 6 passed: system config page loaded. | Copilot |
| BRW-302 | PASS | Editable config row save flow passed with stable selectors and real backend response. | Codex |
| BRW-303 | PASS | Canonical seed now includes deterministic non-editable key (`challenge.upload_path`), so read-only row renders and blocks update action. | Codex |
| BRW-304 | PASS | Secret config rows remain masked by default in list view; browser verification passed. | Codex |
| BRW-305 | PASS | Secret update confirmation dialog appears before submission; browser verification passed. | Codex |
| BRW-401 | PASS | Supplemental Playwright case passed: both `/vi/login` and `/en/login` rendered login form. | Copilot |
| BRW-402 | PASS | Supplemental Playwright case passed: admin shell/navigation markers visible after login. | Copilot |
| BRW-403 | PASS | Supplemental Playwright case passed: unauth access to `/vi/admin/rbac` redirected to `/vi/admin/login`. | Copilot |
| BRW-404 | PASS | Session continuity verified by integration reload flow with persisted access token on protected route. | Codex |

---

## 6.1 Execution Notes (2026-04-19)

- Executed command: `npx playwright test playwright.integration.test.ts --reporter=list`.
- Result summary: 8 passed, 1 failed.
- Failure source: `playwright.integration.test.ts:156` (`Token persistence across reload`).
- Error context artifact: `frontend/test-results/playwright.integration-FE--e32b1-n-persistence-across-reload/error-context.md`.
- Backend runtime: daphne on `127.0.0.1:8000`.
- Frontend runtime: next dev on `localhost:4000` with MSW env flags set to false.

## 6.2 Execution Notes (2026-04-19 - Round 2)

- Executed command: `npx playwright test playwright.slice1-4.checklist.test.ts --reporter=list`.
- Result summary: 6 passed, 7 failed.
- Newly covered checklist IDs: `BRW-102`, `BRW-104`, `BRW-106`, `BRW-202`, `BRW-203`, `BRW-204`, `BRW-302`, `BRW-303`, `BRW-304`, `BRW-305`, `BRW-401`, `BRW-402`, `BRW-403`.
- Failure artifacts:
	- `frontend/test-results/playwright.slice1-4.checkl-3699a-from-login-and-token-is-set/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-46d93-to-admin-RBAC-is-restricted/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-ed905-rs-between-admin-and-editor/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-d5018-key-can-be-edited-and-saved/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-5c708-ig-key-blocks-update-action/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-37927--value-is-masked-by-default/error-context.md`
	- `frontend/test-results/playwright.slice1-4.checkl-ced47-equires-confirmation-dialog/error-context.md`

## 6.3 Execution Notes (2026-04-20 - Stable Runtime Validation)

- Frontend runtime was switched from `next dev` to `npm run build` + `npm run start` for deterministic Playwright execution.
- Added local frontend env wiring for real-backend browser runs: `NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_ENABLE_MSW=false`, `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws`.
- Reran deterministic backend bootstrap (`flush`, `migrate`, `seed_config`, `seed_roles`) and recreated `admin`, `editor1`, `member1`.
- Fixed frontend admin route hydration so valid admin-surface users are not bounced through `/admin/login` back to `/admin/dashboard` when opening protected admin routes directly.
- Updated canonical config seed so `challenge.upload_path` is `is_editable=false`, satisfying Slice 3 non-editable config acceptance criteria on real backend data.
- Executed command: `npx playwright test playwright.slice1-4.checklist.test.ts --workers=1 --reporter=line`.
- Result summary: `13 passed`.
- Executed command: `npx playwright test playwright.integration.test.ts playwright.slice1-4.checklist.test.ts --workers=1 --reporter=line`.
- Result summary: `22 passed`.
- No open browser regression remains for Slice 1-4 checklist scope after this round.

---

## 6. Sign-off

- **SGN-001 QA Owner**: Name / Date / Result
- **SGN-002 Frontend Owner**: Name / Date / Result
- **SGN-003 Backend Owner**: Name / Date / Result
- **SGN-004 Final Decision**: Ready
