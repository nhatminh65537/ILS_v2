# Release Checklist — Slices 5-8 (Docs)

> Purpose: final documentation gate before implementation/review for Slice 5 (Learn), Slice 6 (Challenge), Slice 7 (Quiz), Slice 8 (User Profile).
> Last updated: 2026-04-01

---

## 1) Global Consistency Gate

- [ ] Namespaced API routes are used consistently: `/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`.
- [ ] No active spec example uses legacy flat domain routes unless explicitly marked as historical/runtime-legacy.
- [ ] Secret config policy is consistent across docs: masked by default, clear read requires `system.config.view_secret`.
- [ ] Outline integration is documented as backend-mediated (frontend does not call Outline directly).
- [ ] WebSocket quiz auth is documented as first-message auth (no JWT in query string).
- [ ] `docs/DECISIONS.md` status and `docs/STATUS.md` blockers are aligned.

---

## 2) Slice 5 — Learn

- [ ] Lesson node creation is atomic (lesson + node in one transaction).
- [ ] Mini-quiz uses shared `quiz_question` source (`lesson_question` mapping).
- [ ] Progress strategy uses versioned lazy recompute per `(user, course)`.
- [ ] Course deletion strategy is hybrid: archive for normal flow, restricted soft-delete/purge path.
- [ ] Slug flow is manual-first with server conflict suggestions.
- [ ] Lesson start is explicit (`POST /progress/start`).
- [ ] Lesson completion is hybrid (guided + explicit complete action).
- [ ] Outline sync behavior is async queue with previous content preserved until success.

---

## 3) Slice 6 — Challenge

- [ ] Challenge endpoints in docs are namespaced under `/api/challenge/*`.
- [ ] Flag submission and progress contracts are consistent between PRD, IMPL plan, and API docs.
- [ ] `Q-CHALL-01` (instance scope) is clearly marked OPEN in both decisions and status docs.
- [ ] `Q-CHALL-02` deployment protocol is marked RESOLVED and referenced where needed.

---

## 4) Slice 7 — Quiz

- [ ] Quiz CRUD and question contracts use `/api/quiz/*` naming.
- [ ] WebSocket section defines auth-first message sequence and timeout/close behavior.
- [ ] No doc instructs `?token=` in WebSocket URL.
- [ ] Attempt/progress update flow is consistent in PRD + architecture + impl plan.

---

## 5) Slice 8 — User Profile

- [ ] Profile endpoint names/behaviors are aligned between API reference and implementation plan.
- [ ] Profile stats sources reference the same upstream progress models (learn/challenge/quiz).
- [ ] Permission requirements for profile edit/view are clearly documented.

---

## 6) Cross-Doc Verification Targets

Run this checklist against these files:

- `docs/DECISIONS.md`
- `docs/STATUS.md`
- `docs/API.md`
- `docs/API_ROUTE_MAPPING.md`
- `docs/IMPL_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/CONFIG.md`
- `docs/REQUIREMENTS.md`
- `docs/prd/03-learn.md`
- `docs/prd/04-challenge.md`
- `docs/prd/05-quiz.md`
- `docs/prd/06-user-profile.md`

---

## 7) Release Sign-Off

- [ ] Docs Owner (Backend) sign-off
- [ ] Docs Owner (Frontend) sign-off
- [ ] Final consistency pass completed (no unresolved contradictions)
- [ ] Ready for implementation PRs for Slices 5-8

