# API Route Mapping — Legacy to Target

> Single source of truth for endpoint migration from historical/legacy examples to target contracts.
> Last updated: 2026-04-01

---

## 1. Usage Rules

- Historical routes are retained only for runtime-compatibility notes.
- New implementation and new documentation must use target routes.
- If a legacy route and target route differ in identifier semantics (`id` vs `slug`), follow the target contract.

---

## 2. HTTP Route Mapping

| Domain | Legacy/Historical Route | Target Route | Status | Notes |
|---|---|---|---|---|
| Learn | `/api/courses/` | `/api/learn/courses/` | Use target for new work | Domain namespaced |
| Learn | `/api/courses/{id}/` | `/api/learn/courses/{slug}/` | Use target for new work | Identifier changes from `id` to `slug` |
| Learn | `/api/courses/{id}/tree/` | `/api/learn/courses/{slug}/nodes/` | Use target for new work | Tree contract is node-based |
| Learn | `/api/courses/{id}/progress/` | `/api/learn/courses/{slug}/progress/` | Use target for new work | Same feature, namespaced path |
| Learn | `/api/lessons/` | `/api/learn/lessons/` | Use target for new work | Domain namespaced |
| Learn | `/api/lessons/{id}/` | `/api/learn/lessons/{id}/` | Use target for new work | Domain namespaced |
| Learn | `/api/lessons/{id}/complete/` | `/api/learn/lessons/{id}/progress/complete/` | Use target for new work | Completion now under progress namespace |
| Challenge | `/api/challenges/` | `/api/challenge/challenges/` | Use target for new work | Domain namespaced |
| Challenge | `/api/challenges/{id}/` | `/api/challenge/challenges/{slug}/` | Use target for new work | Identifier changes from `id` to `slug` |
| Challenge | `/api/challenges/{id}/submit-flag/` | `/api/challenge/challenges/{slug}/submit/` | Use target for new work | Submit contract unified |
| Challenge | `/api/challenges/{id}/create-instance/` | `/api/challenge/challenges/{slug}/instance/` | Use target for new work | Instance lifecycle endpoint |
| Quiz | `/api/quizzes/` | `/api/quiz/quizzes/` | Use target for new work | Domain namespaced |
| Quiz | `/api/quizzes/{id}/` | `/api/quiz/quizzes/{id}/` | Use target for new work | Domain namespaced |
| RBAC | `/api/authz/permissions/` | `/api/admin/permissions/` | Use target for new work | Admin namespace standardized |
| RBAC | `/api/authz/roles/` | `/api/admin/roles/` | Use target for new work | Admin namespace standardized |
| System Config | `/api/config/` | `/api/admin/config/` | Use target for new work | Admin-only API |
| System Config | `/api/config/{key}/` | `/api/admin/config/{key}/` | Use target for new work | Key-based lookup/update |

---

## 3. WebSocket Auth Mapping

| Legacy/Historical Pattern | Target Pattern | Status | Notes |
|---|---|---|---|
| `ws://host/ws/quiz/{quiz_id}/?token={jwt}` | Connect without token in URL: `ws://host/ws/quiz/{quiz_id}/` then send first message `{type: "auth", token: "<access_jwt>"}` | Use target for new work | Avoid token leakage in logs/history |

---

## 4. Cross-Reference

- Decisions: `docs/DECISIONS.md`
- Active vs planned APIs: `docs/API.md`
- Implementation sequencing: `docs/IMPL_PLAN.md`
- Release gate: `docs/RELEASE_CHECKLIST_SLICE5_8.md`
