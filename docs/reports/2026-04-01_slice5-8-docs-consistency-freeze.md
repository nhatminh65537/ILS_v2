# Report — Docs Consistency Freeze (Slices 5-8)

Date: 2026-04-01
Scope: Align all relevant documentation with the latest design decisions for Slice 5, 6, 7, 8.

---

## 1. Objective

- Consolidate and apply the latest agreed decisions across docs.
- Remove route-contract drift between legacy examples and target namespaced APIs.
- Ensure consistency for Learn, Challenge, Quiz, and System Config security behavior.

---

## 2. Decisions Applied

### Slice 5 (Learn)
- Lesson node creation is atomic (lesson + node in one transaction).
- Mini-quiz reuses quiz question bank.
- Course progress uses versioned lazy recompute per user-course.
- Course deletion strategy is hybrid: archive for normal flow, soft-delete/purge for restricted cleanup.
- Slug strategy is manual-first with server suggestions on conflict.
- Outline integration is backend-mediated; frontend does not call Outline directly.
- Tag operations are permission-based (RBAC key-based), not hardcoded by role.
- Lesson start is explicit.
- Lesson completion is hybrid (guided + explicit complete action).
- Outline sync failure handling is async queue.

### Slice 7 (Quiz)
- WebSocket JWT auth is first-message based (no token in query string).

### Cross-cutting (System Config)
- Secret values are masked by default.
- Clear-text secret read is restricted to manual seeded permission: system.config.view_secret.

---

## 3. Documents Updated

### Core architecture and contracts
- docs/DECISIONS.md
- docs/ARCHITECTURE.md
- docs/API.md
- docs/API_ROUTE_MAPPING.md (new)
- docs/IMPL_PLAN.md
- docs/REQUIREMENTS.md

### Data/config model docs
- docs/DATA_MODEL.md
- docs/CONFIG.md

### Product requirement docs
- docs/prd/02-authorization.md
- docs/prd/03-learn.md
- docs/prd/05-quiz.md
- docs/prd/06-user-profile.md
- docs/prd/10-system-config.md

### Planning and governance docs
- docs/STATUS.md
- docs/TEAM_PLAN.md
- docs/RELEASE_CHECKLIST_SLICE5_8.md (new)

---

## 4. Consistency Verification Summary

### Route consistency
- Legacy routes are kept only as historical/runtime notes.
- Target contracts are namespaced and documented for new work.
- A single mapping source now exists in docs/API_ROUTE_MAPPING.md.

### Security consistency
- Secret config visibility policy is aligned across API/PRD/Config/Data model docs.
- WebSocket auth policy is aligned across Decisions, PRD, Architecture, and Impl Plan.

### Learn flow consistency
- Start/complete triggers, progress recalculation strategy, Outline mediation, and slug conflict behavior are aligned across Decisions, PRD, Requirements, Data model, and Impl Plan.

### Decision freeze confirmation
- The following decision set is now considered frozen (no cross-doc conflict found during this pass):
	- Slice 5 Learn decisions: Q-LEARN-01 to Q-LEARN-10 (all RESOLVED)
	- Slice 7 WebSocket auth decision: first-message JWT auth, no token in query string
	- System Config secret policy: masked by default; clear read requires `system.config.view_secret`
- `Q-CHALL-01` remains OPEN by design and is consistently marked OPEN in decision/status/plan docs.

---

## 5. Remaining Open Item

- Q-CHALL-01 remains OPEN: challenge instance scope in MVP.
- This is consistently marked OPEN in decisions/status docs.

---

## 6. Normalization Applied After Freeze

1. Slice 8 profile endpoint family normalized to canonical `/api/users/me/*` + `/api/users/{username}/*` contract:
  - PRD 06 own-profile endpoints updated from `/api/me/*` to `/api/users/me/*`.
  - IMPL_PLAN Task 8.1 and verification checklist aligned to `/api/users/me/profile/` + patch endpoints.
  - TEAM_PLAN Slice 8 checklist aligned to `GET/PATCH /api/users/me/profile/`.

2. Slice 5 atomic lesson creation wording normalized:
  - PRD 03 now states lesson creation goes through `POST /api/learn/courses/{slug}/nodes/` with `is_item=true`.
  - DECISIONS Q-LEARN-01 now includes explicit MVP contract note that `POST /api/learn/lessons/` is not a primary creation path.

3. Residual drift status:
  - No remaining cross-doc drift found for the frozen decision set of Slice 5, Slice 7, and System Config policy.

---

## 7. Release Gate Status (Docs)

- Release checklist for slices 5-8 exists at docs/RELEASE_CHECKLIST_SLICE5_8.md.
- Status doc references the checklist as required gate before implementation PR.

---

## 8. Recommended Next Action

- Finalize Q-CHALL-01 scope.
- Re-run release checklist, then start implementation PRs by slice.
