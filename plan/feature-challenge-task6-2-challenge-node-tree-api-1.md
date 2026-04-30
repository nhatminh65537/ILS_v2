---
goal: Task 6.2 Challenge node tree API
version: 1.0
date_created: 2026-04-30
last_updated: 2026-04-30
owner: ILS v2 team
status: 'Planned'
tags: [feature, challenge, api, slice-6]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan delivers Task 6.2: the ChallengeNode tree CRUD API under `/api/challenge/nodes/*`, including lazy children loading and safe move semantics, aligned with the Challenge domain data model and Slice 6 decisions.

## 1. Requirements & Constraints

- **REQ-001**: Implement ChallengeNode CRUD endpoints under `/api/challenge/nodes/*` with list, retrieve, create, update, delete, children, and move actions.
- **REQ-002**: Enforce ChallengeNode invariants from `docs/DATA_MODEL.md`: `is_item=false` requires `challenge_id=null`; `is_item=true` requires `challenge_id` and must be unique.
- **REQ-003**: Implement lazy tree loading: `children` returns only direct children, ordered by `position`, `id`.
- **REQ-004**: Move action must update `path` for self and all descendants and prevent cycles.
- **SEC-001**: All endpoints require `IsAuthenticated` and `HasJWTPermission`; write actions gated to Admin/Editor via `@add_role_granted`.
- **CON-001**: Use `BaseNode` tree helpers (`move_to`, `rebuild_path`, `would_create_cycle`) to maintain dot-separated `path` invariants.
- **CON-002**: `path` is server-managed and read-only in serializers; client may not set it directly.
- **GUD-001**: Follow patterns from `QuizNodeViewSet` in `backend/api/views/quizzes.py` and list/children ordering behavior.
- **PAT-001**: Update `docs/API.md` and `docs/STATUS.md` in the same session after implementation and tests.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add ChallengeNode serializer and viewset, then wire routing and exports.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `ChallengeNodeSerializer` in `backend/api/serializers/challenge.py` with fields `id`, `parent`, `is_item`, `title`, `position`, `path`, `challenge`, `has_children`. Implement validation: (1) `is_item=true` requires `challenge`; (2) `is_item=false` forbids `challenge`; (3) reject parent that is an item node; (4) prevent linking a `challenge` already bound to another node (exclude current instance). | | |
| TASK-002 | Create `backend/api/views/challenge_nodes.py` with `ChallengeNodeViewSet` (ModelViewSet). Configure `queryset = ChallengeNode.objects.select_related('parent','challenge').order_by('position','id')` and `permission_classes = [IsAuthenticated, HasJWTPermission]`. Implement: `list` (root nodes only), `children` action (direct children only), `move` action (new parent by `parent_id`, cycle check using `BaseNode.would_create_cycle`, call `move_to`, return 400 on invalid). Add `@add_role_granted('Admin','Editor')` on create/update/partial_update/destroy/move. | | |
| TASK-003 | Wire viewset exports and routes: add `ChallengeNodeViewSet` to `backend/api/views/__init__.py`, then add URL patterns in `backend/api/urls.py` for `challenge/nodes/`, `challenge/nodes/{id}/`, `challenge/nodes/{id}/children/`, and `challenge/nodes/{id}/move/` matching the Quiz node route style. | | |

### Implementation Phase 2

- GOAL-002: Add tests and documentation updates for the ChallengeNode API.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Add `backend/api/tests/test_challenge_node_api.py` integration tests: (1) editor creates root folder node (path empty), (2) editor creates item node linked to existing Challenge, (3) children endpoint returns only direct children, (4) move updates `path` for descendants, (5) cycle move returns 400, (6) member read allowed but write forbidden (403). | | |
| TASK-005 | Update `docs/API.md` to list the new Challenge node endpoints under the challenge section and set their status to `Partial` once implemented. | | |
| TASK-006 | Update `docs/STATUS.md` to mark Slice 6 Task 6.2 as completed and add the report reference after delivery. | | |

## 3. Alternatives

- **ALT-001**: Reuse `LearnCourseNodeViewSet` style (custom ViewSet + service layer) instead of ModelViewSet. Not chosen because Task 6.2 explicitly references the `QuizNodeViewSet` ModelViewSet pattern.
- **ALT-002**: Allow parent changes via update instead of a separate `move` action. Not chosen to match the explicit `move` endpoint in Task 6.2 and keep update scoped to title/position.

## 4. Dependencies

- **DEP-001**: `ChallengeNode` model and `BaseNode` helpers in `backend/api/models.py` (`move_to`, `rebuild_path`, `would_create_cycle`).
- **DEP-002**: Permission scan auto-discovery via `auth_app.services.permission_discovery.discover_permissions()`; no manual permission seeding required.
- **DEP-003**: `docs/DATA_MODEL.md` challenge node invariants and path rules.

## 5. Files

- **FILE-001**: `backend/api/serializers/challenge.py` (add `ChallengeNodeSerializer` and validations).
- **FILE-002**: `backend/api/views/challenge_nodes.py` (new Challenge node viewset).
- **FILE-003**: `backend/api/views/__init__.py` (export `ChallengeNodeViewSet`).
- **FILE-004**: `backend/api/urls.py` (register `/api/challenge/nodes/*` routes).
- **FILE-005**: `backend/api/tests/test_challenge_node_api.py` (new integration tests).
- **FILE-006**: `docs/API.md` (document endpoints and status).
- **FILE-007**: `docs/STATUS.md` (mark Task 6.2 completed after delivery).

## 6. Testing

- **TEST-001**: `pytest backend/api/tests/test_challenge_node_api.py`
- **TEST-002**: `pytest backend/api/tests/test_challenge_api.py` (if present) to ensure challenge CRUD still passes after routing updates.

## 7. Risks & Assumptions

- **RISK-001**: Recursive `rebuild_path()` could be slow for deep trees; acceptable for MVP scale but may need bulk update later.
- **RISK-002**: Challenge nodes linked to unpublished challenges might leak to members if read is allowed for all; verify role scope is desired.
- **ASSUMPTION-001**: Read access to challenge nodes is allowed for Admin/Editor/Member (same as `QuizNodeViewSet`), while writes are Admin/Editor-only.
- **ASSUMPTION-002**: Item node creation links to an existing `Challenge` (created via Task 6.1), not an inline challenge create.

## 8. Related Specifications / Further Reading

- `docs/IMPL_PLAN.md` (Slice 6 Task 6.2)
- `docs/prd/04-challenge.md`
- `docs/DATA_MODEL.md` (ChallengeNode, BaseNode path rules)
- `backend/api/views/quizzes.py` (QuizNodeViewSet reference)
