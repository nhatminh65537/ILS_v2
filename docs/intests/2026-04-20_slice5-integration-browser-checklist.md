# Integration Browser Checklist - Slice 5 Learn (DEV-first)

> Scope: Learn domain (courses, nodes, lessons, progress) with browser checklist targets
> Environment: local DEV only
> Last updated: 2026-04-20

---

## 1. Environment Preconditions

- **PRE-501**: Backend URL is `http://localhost:8000`.
- **PRE-502**: Frontend URL is `http://localhost:4000`.
- **PRE-503**: Frontend runs against real backend API (MSW disabled) when executing browser checklist.

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
- Learn routes and APIs are reachable in DEV.

---

## 2. Database Setup (Deterministic)

- **DB-501**: Reset and migrate DB before checklist execution.
- **DB-502**: Seed config + role baseline.
- **DB-503**: Seed deterministic Learn test data (courses, nodes, lessons, progress fixtures).

### DB Commands

```bash
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
```

Expected result:
- Learn test fixtures are available for backend and browser verification.

---

## 3. Browser Checklist Cases

### User Learn Surface

- [ ] **BRW-501**: Login as `member1`; open `/{locale}/courses`; published-only course list renders.
- [ ] **BRW-502**: Course catalog filters (search/category/tag) update visible results deterministically.
- [ ] **BRW-503**: Open `/{locale}/courses/{slug}`; root tree nodes render and folder expansion lazy-loads children.
- [ ] **BRW-504**: Open `/{locale}/courses/{slug}/lessons/{id}`; lesson type renderer appears for markdown/video/miniquiz.
- [ ] **BRW-505**: Explicit Start/Complete actions are visible and progress panel updates after completion.

### Admin Learn Surface

- [ ] **BRW-511**: Login as `admin`; open `/{locale}/admin/learn/courses`; list renders with actions.
- [ ] **BRW-512**: Login as `editor1`; open admin Learn route; editor-authorized actions are available.
- [ ] **BRW-513**: Login as `member1`; direct access to admin Learn route is blocked by policy.

---

## 4. API Cross-check and Logs

- **API-501**: Execute Learn backend test suites and collect summary.
- **API-502**: Map backend results to Slice 5 checklist contract in `docs/RELEASE_CHECKLIST_SLICE5_8.md`.
- **API-503**: Record uncovered checklist items as explicit evidence gaps.

### API Command (Executed)

```powershell
& "E:\code\ILS_v2\.venv\Scripts\python.exe" -m pytest "E:\code\ILS_v2\backend\api\tests\test_learn_course_api.py" "E:\code\ILS_v2\backend\api\tests\test_learn_course_node_api.py" "E:\code\ILS_v2\backend\api\tests\test_learn_lesson_api.py" "E:\code\ILS_v2\backend\api\tests\test_learn_progress_api.py" -ra
```

Observed result:
- **34 passed in 27.64s**

---

## 5. Result Matrix

| Case ID | Status (PASS/FAIL/BLOCKED) | Notes | Owner |
|---------|-----------------------------|-------|-------|
| API-501 | PASS | Learn backend suites executed successfully: 34 passed, 0 failed. | Copilot |
| API-502 | PASS | Contract items validated by tests: atomic node+lesson create, miniquiz mapping, versioned progress recompute, hybrid delete, slug conflict, explicit start/complete endpoints. | Copilot |
| API-503 | PASS | Evidence gap documented explicitly for browser automation coverage. | Copilot |
| BRW-501 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-502 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-503 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-504 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-505 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-511 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-512 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |
| BRW-513 | BLOCKED | No dedicated executable Slice 5 Playwright checklist file exists in repository. | Copilot |

### 5.1 Execution Notes (2026-04-20, Round 1)

- Backend Slice 5 API suites were run successfully with full pass.
- Existing frontend test files in repository are:
  - `frontend/playwright.integration.test.ts`
  - `frontend/playwright.slice1-4.checklist.test.ts`
  - `frontend/playwright.slice7.checklist.test.ts`
- Missing executable target: `frontend/playwright.slice5.checklist.test.ts`.

---

## 6. Sign-off

- **SGN-501 QA Owner**: Name / Date / Result
- **SGN-502 Frontend Owner**: Name / Date / Result
- **SGN-503 Backend Owner**: Name / Date / Result
- **SGN-504 Final Decision**: Partial (backend verified, browser checklist pending)
