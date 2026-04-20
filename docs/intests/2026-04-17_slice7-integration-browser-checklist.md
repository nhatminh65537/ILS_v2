# Integration Browser Checklist - Slice 7 Quiz (DEV-first)

> Scope: Quiz user/admin surfaces + protocol checks
> Environment: local DEV only
> Last updated: 2026-04-20

---

## 1. Environment Preconditions

- **PRE-701**: Backend must run with ASGI server for WebSocket behavior.
- **PRE-702**: Backend URL is `http://localhost:8000`, WS URL is `ws://localhost:8000/ws`.
- **PRE-703**: Frontend URL is `http://localhost:4000`.
- **PRE-704**: Frontend must run with MSW disabled for real backend calls.

### PRE Commands

```bash
# Terminal A - Backend (ASGI)
cd backend
daphne -p 8000 backend.asgi:application

# Terminal B - Frontend
cd frontend
npm run dev
```

Expected result:
- Quiz API and WebSocket endpoints are reachable in DEV.

---

## 2. Database Setup (Deterministic)

- **DB-701**: Reset database and apply migrations.
- **DB-702**: Seed system configs and roles.
- **DB-703**: Seed quiz baseline data (categories, quizzes, questions, users, role mappings).
- **DB-704**: Validate seeded IDs before browser tests.

### DB Commands

```bash
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
# Reuse deterministic seed script from Slice 7 integration docs
# docs/intests/2026-04-14_slice7-integration.md (section 2.1)
```

Expected result:
- Test users exist (`admin`, `editor1`, `member1`, `member2`).
- At least one published quiz with questions exists.

---

## 3. Browser Checklist Cases

### User Surface

- [ ] **BRW-701**: Login as `member1`; open quiz catalog route; page renders quiz list.
- [ ] **BRW-702**: Search/filter in quiz catalog updates visible list deterministically.
- [ ] **BRW-703**: Start quiz attempt from a published quiz; first question renders.
- [ ] **BRW-704**: Submit answer for question type `single_choice`; UI moves to next state.
- [ ] **BRW-705**: Submit answer for question type `multi_choice`; scoring-related feedback appears only where intended.
- [ ] **BRW-706**: Submit answer for question type `fill_blank`; attempt state updates.
- [ ] **BRW-707**: Complete attempt; result summary page displays score/time/progress.

### Admin/Editor Surface

- [ ] **BRW-711**: Login as `admin`; open `/vi/admin/quizzes`; list page renders.
- [ ] **BRW-712**: Open `/vi/admin/quizzes/new`; create form fields render.
- [ ] **BRW-713**: Open quiz editor/detail route for existing quiz; metadata appears.
- [ ] **BRW-714**: Draft quizzes are visible only in admin/editor context according to policy.
- [ ] **BRW-715**: Login as `member1`; direct access to admin quiz routes is blocked or constrained by policy.

### WebSocket Protocol

- [ ] **BRW-721**: Client connects to WS endpoint without token query parameter.
- [ ] **BRW-722**: First message is auth payload as protocol requirement.
- [ ] **BRW-723**: Invalid auth-first sequence causes deterministic close/deny behavior.
- [ ] **BRW-724**: Connection close/reconnect handling does not corrupt active attempt UI state.

---

## 4. API Cross-check and Logs

- **API-701**: Execute `integration-test/slice7/run_requests_integration.py` after browser pass.
- **API-702**: Compare browser failures against `integration-test/slice7/requests-test-results.md`.
- **API-703**: Record mismatches by case ID with endpoint + HTTP status + payload excerpt.

---

## 5. Result Matrix

| Case ID | Status (PASS/FAIL/BLOCKED) | Notes | Owner |
|---------|-----------------------------|-------|-------|
| BRW-701 | FAIL | Diagnostics showed member navigation to `/vi/quizzes` redirected to `/vi/dashboard` (catalog unreachable in authenticated flow). | Copilot |
| BRW-702 | FAIL | Cannot execute catalog search because quiz catalog route is redirected away from `/vi/quizzes`. | Copilot |
| BRW-703 | FAIL | Diagnostics showed `/vi/quizzes/1` redirected to `/vi/dashboard`; quiz detail content not reachable. | Copilot |
| BRW-704 | FAIL | Session route `/vi/quizzes/1/session` redirected to `/vi/dashboard`; no active session state observed. | Copilot |
| BRW-705 | BLOCKED | Blocked by BRW-704: no question answering state reachable in current browser flow. | Copilot |
| BRW-706 | BLOCKED | Blocked by BRW-704: no fill-blank submission path reachable in current browser flow. | Copilot |
| BRW-707 | BLOCKED | Blocked by BRW-704: finish screen path unreachable due session route redirect. | Copilot |
| BRW-711 | FAIL | `/vi/admin/quizzes` redirected to `/vi/admin/dashboard`; admin quiz list UI did not render table/create controls. | Copilot |
| BRW-712 | FAIL | Create page not validated because quizzes entry route did not expose list/create navigation state. | Copilot |
| BRW-713 | FAIL | Quiz detail editor route not validated; diagnostics redirected to admin dashboard. | Copilot |
| BRW-714 | FAIL | Draft visibility could not be asserted in admin list because quiz table was not rendered on tested flow. | Copilot |
| BRW-715 | FAIL | Member can access admin shell (`/vi/admin/dashboard`) and is not constrained to member surface in browser routing layer. | Copilot |
| BRW-721 | BLOCKED | WebSocket protocol checks blocked because session page is unreachable in browser flow. | Copilot |
| BRW-722 | BLOCKED | WebSocket protocol checks blocked because session page is unreachable in browser flow. | Copilot |
| BRW-723 | BLOCKED | WebSocket protocol checks blocked because session page is unreachable in browser flow. | Copilot |
| BRW-724 | BLOCKED | WebSocket protocol checks blocked because session page is unreachable in browser flow. | Copilot |

---

## 6.1 Execution Notes (2026-04-19)

- Reviewed Slice 7 docs and prior artifacts before execution:
	- `docs/intests/2026-04-13_slice7-quiz-ui.md`
	- `docs/intests/2026-04-14_slice7-integration.md`
	- `integration-test/slice7/browser-test-results.md`
	- `integration-test/slice7/requests-test-results.md`
- Ran browser coverage command: `npx playwright test playwright.slice7.checklist.test.ts --reporter=list`.
- Browser result summary: 2 passed, 5 failed.
- Ran diagnostics command: `node scripts/slice7-diagnostics.mjs`.
- Diagnostics summary:
	- Member authenticated state lands on `/vi/dashboard`; navigating to quiz routes redirects back to dashboard.
	- Admin authenticated state lands in admin shell; navigating to `/vi/admin/quizzes` resolves to `/vi/admin/dashboard` and quiz list is not rendered.
	- Member can access admin shell route (`/vi/admin/dashboard`) in browser-level routing.
- Ran API cross-check command: `python integration-test/slice7/run_requests_integration.py` using project venv.
- API runner result summary: failed at runner bootstrap (`Cannot obtain token for user=admin`).
- Evidence artifacts:
	- `integration-test/slice7/requests-test-results.md`
	- `integration-test/slice7/requests-test-results.json`
	- `frontend/test-results/playwright.slice7.checklis-1ea58-hed-quizzes-and-hides-draft/error-context.md`
	- `frontend/test-results/playwright.slice7.checklis-21f57-log-search-filters-by-title/error-context.md`
	- `frontend/test-results/playwright.slice7.checklis-78d2c-itle-stats-and-session-link/error-context.md`
	- `frontend/test-results/playwright.slice7.checklis-a1abe-connection-error-for-member/error-context.md`
	- `frontend/test-results/playwright.slice7.checklis-eb2b4-and-exposes-draft-row-state/error-context.md`

---

## 6.2 Follow-up Fixes (2026-04-20)

- Updated `frontend/playwright.slice7.checklist.test.ts` so user-surface cases authenticate `member1` before opening protected quiz routes, wait for post-login navigation deterministically, and use the seeded admin password `admin1234` instead of stale `admin`.
- Updated `frontend/scripts/slice7-diagnostics.mjs` to seed auth with the canonical Slice 7 fixture credentials (`admin/admin1234`, `member1/member1234`) so diagnostics no longer report false negatives caused by invalid login data.
- Updated `frontend/src/hooks/useQuizSession.ts` to prefer `NEXT_PUBLIC_WS_URL` as the authoritative WebSocket root, with fallback to `NEXT_PUBLIC_API_URL` only when the WS env var is absent.
- Updated `frontend/src/hooks/useQuizSession.ts` to map close codes `4001/4008` to auth failure and `4002/4003/4004/4011` to session errors instead of collapsing all closes into a generic connection failure.
- Updated `backend/api/services/quiz_service.py` and `backend/realtime/consumers/quiz_consumer.py` so newly created quiz configs default to `random_question=false` and `random_option=false`, matching the Slice 7 checklist contract.
- Updated `backend/realtime/consumers/quiz_consumer.py` so empty published quizzes finish immediately with `total_score=0` and `max_score=0` instead of returning `no_questions`, matching case IX-7 in the integration checklist.
- Added regression coverage:
	- `backend/api/tests/test_quiz_api.py` now asserts the expected default config values.
	- `backend/realtime/tests/test_quiz_consumer.py` now asserts the empty-quiz immediate-finish behavior.
- Validation executed after the fixes:
	- `.venv\Scripts\python.exe -m pytest backend/api/tests/test_quiz_api.py -q`
	- `.venv\Scripts\python.exe -m pytest backend/realtime/tests/test_quiz_consumer.py -q`
	- `npm run lint -- src/hooks/useQuizSession.ts playwright.slice7.checklist.test.ts scripts/slice7-diagnostics.mjs`
- Current checklist state after this follow-up:
	- Historical FAIL/BLOCKED entries in the matrix above remain as evidence of the 2026-04-19 run.
	- The underlying code and local diagnostics for several root-cause issues are fixed.
	- Full browser retest of BRW-701..724 has **not** been re-executed yet in this session, so no case is upgraded to PASS here.

---

## 6. Sign-off

- **SGN-701 QA Owner**: Name / Date / Result
- **SGN-702 Frontend Owner**: Name / Date / Result
- **SGN-703 Backend Owner**: Name / Date / Result
- **SGN-704 Final Decision**: Ready / Not Ready
