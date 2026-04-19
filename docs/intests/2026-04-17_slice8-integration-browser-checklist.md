# Integration Browser Checklist - Slice 8 User Profile (DEV-first)

> Scope: User profile, session management, and related admin-user checks
> Environment: local DEV only
> Last updated: 2026-04-17

---

## 1. Environment Preconditions

- **PRE-801**: Backend URL is `http://localhost:8000`.
- **PRE-802**: Frontend URL is `http://localhost:4000`.
- **PRE-803**: Frontend must run against real backend API (MSW disabled).

### PRE Commands

```bash
# Terminal A - Backend
cd backend
daphne -p 8000 backend.asgi:application

# Terminal B - Frontend
cd frontend
npm run dev
```

Expected result:
- Profile and session endpoints are reachable in DEV.

---

## 2. Database Setup (Deterministic)

- **DB-801**: Reset and migrate DB before test execution.
- **DB-802**: Seed config + role baseline.
- **DB-803**: Seed deterministic users and role mappings.
- **DB-804**: Verify users exist before browser flow starts.

### DB Commands

```bash
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
# Reuse deterministic slice8 setup script
# integration-test/slice8/setup.ps1
```

Expected result:
- User set for profile/session tests is present and login-ready.

---

## 3. Browser Checklist Cases

### User Profile

- [ ] **BRW-801**: Login as `member1`; open profile page; base profile data renders.
- [ ] **BRW-802**: Edit allowed profile fields; save success message appears and values persist after refresh.
- [ ] **BRW-803**: Submit invalid profile data (format/required violations); field-level validation appears.
- [ ] **BRW-804**: Locale parity check on profile page for `/vi` and `/en` routes.

### Session Management

- [ ] **BRW-811**: Open session management page as logged-in user; active sessions list renders.
- [ ] **BRW-812**: Revoke one non-current session; list updates and revoked session is removed.
- [ ] **BRW-813**: Revoke current session (if supported); user is forced to re-authenticate deterministically.
- [ ] **BRW-814**: After token refresh cycle, session state remains consistent and does not duplicate entries.

### Admin/User Management Surface (if enabled by scope)

- [ ] **BRW-821**: Login as `admin`; open admin user management route; list renders.
- [ ] **BRW-822**: Perform one allowed admin user action and verify UI reflects updated state.
- [ ] **BRW-823**: Login as `member1`; direct access to admin user management is blocked or constrained by policy.

---

## 4. API Cross-check and Logs

- **API-801**: Execute `integration-test/slice8/test_slice8_requests.py` and compare outcome with browser observations.
- **API-802**: Review `integration-test/slice8/slice8_requests_results.md` for endpoint-level discrepancies.
- **API-803**: Log each mismatch with case ID, endpoint, expected status, actual status, and payload excerpt.

---

## 5. Result Matrix

| Case ID | Status (PASS/FAIL/BLOCKED) | Notes | Owner |
|---------|-----------------------------|-------|-------|
| BRW-801 | FAIL | After login as `member1`, navigating to `/vi/profile/settings` resolved to `/vi/dashboard`; profile page did not render. | Copilot |
| BRW-802 | BLOCKED | Cannot verify profile edit/save persistence because profile settings surface is not reachable in browser flow (see BRW-801). | Copilot |
| BRW-803 | BLOCKED | Field-level validation cannot be executed because profile form is not reachable in browser flow (see BRW-801). | Copilot |
| BRW-804 | FAIL | Locale route `/en/profile/settings` resolved to `/en/dashboard`; profile page parity cannot be confirmed. | Copilot |
| BRW-811 | FAIL | Navigating to `/vi/profile/sessions` resolved to `/vi/dashboard`; sessions table did not render. | Copilot |
| BRW-812 | BLOCKED | Revoke non-current session action cannot be executed because sessions page is not reachable in browser flow (see BRW-811). | Copilot |
| BRW-813 | BLOCKED | Current-session revoke scenario cannot be executed because sessions page is not reachable in browser flow (see BRW-811). | Copilot |
| BRW-814 | BLOCKED | Token refresh/session consistency check cannot be validated while session management UI is unreachable (see BRW-811). | Copilot |
| BRW-821 | FAIL | Admin login lands on `/vi/admin/dashboard`; direct navigation to `/vi/admin/users` resolves back to dashboard, user list not rendered. | Copilot |
| BRW-822 | BLOCKED | No actionable admin user list UI available in this run; cannot execute and verify admin user mutation. | Copilot |
| BRW-823 | FAIL | `member1` direct access to admin surface resolved to `/vi/admin/dashboard` (not blocked/challenged at route level). | Copilot |

### 5.1 Execution Notes (2026-04-17, Round 1)

- Verified services were listening on DEV ports: frontend `:4000`, backend `:8000`.
- Attempted deterministic setup script: `integration-test/slice8/setup.ps1`.
	- Result: parse errors in current script body; fallback to targeted account reseed.
- Reseeded deterministic auth users via Django shell to stabilize credentials:
	- `admin/admin1234`, `member1/member1234`, `member2/member1234`, `member3/member1234`, `editor1/editor1234`.
- Executed browser diagnostics command:
	- `node frontend/scripts/slice8-diagnostics.mjs`
	- Observed route outcomes:
		- member profile/settings and profile/sessions paths routed to dashboard.
		- admin users path routed to admin dashboard.
		- member direct admin access landed on admin dashboard.
- Executed API cross-check command:
	- `python integration-test/slice8/test_slice8_requests.py`
	- Summary: **73 passed / 2 failed** out of 75 cases.
	- Failing API cases from report:
		- `IV-1.2`: expected 6 seeded activity events, actual 0.
		- `V-1.3`: expected >=6 seeded users, actual 5.
- Evidence artifacts:
	- `frontend/scripts/slice8-diagnostics.mjs`
	- `integration-test/slice8/slice8_requests_results.md`
	- `integration-test/slice8/slice8_requests_results.json`

---

## 6. Sign-off

- **SGN-801 QA Owner**: Name / Date / Result
- **SGN-802 Frontend Owner**: Name / Date / Result
- **SGN-803 Backend Owner**: Name / Date / Result
- **SGN-804 Final Decision**: Ready / Not Ready
