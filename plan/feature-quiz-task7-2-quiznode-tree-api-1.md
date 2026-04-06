---
goal: Slice 7 Task 7.2 QuizNode Tree API Implementation Plan
version: 1.0
date_created: 2026-04-01
last_updated: 2026-04-01
owner: Backend Team
status: 'Completed'
tags: [feature, quiz, backend, slice-7, tree, api]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines and records the completed backend implementation for Slice 7 Task 7.2: QuizNode tree API. The implementation follows BaseNode tree invariants, preserves one-way quiz-node foreign key direction, and delivers node CRUD, lazy children retrieval, and cycle-safe move behavior.

## 1. Requirements & Constraints

- REQ-001: Expose QuizNode tree endpoints for list root nodes, get node detail, create, update, delete subtree, get children, and move node.
- REQ-002: Preserve one-way foreign key rule (`quiz_node.quiz_id -> quiz`) with no circular FK.
- REQ-003: Reuse BaseNode invariants (`path`, parent tree, cycle checks).
- REQ-004: Implement backend-only scope for Task 7.2.
- REQ-005: Enforce folder-only MVP semantics (`is_item=false`).
- SEC-001: Restrict mutation endpoints to Admin/Editor role behavior.
- SEC-002: Keep authentication required for all QuizNode endpoints.
- CON-001: Keep depth behavior inherited from BaseNode; do not add new config keys.
- CON-002: Do not introduce schema migrations for this task.
- GUD-001: Keep namespaced route style under `/api/quiz/*`.
- GUD-002: Keep implementation inside modular quiz API files.
- PAT-001: Keep integration test style aligned with existing Task 7.1 test module.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Validate existing data model and endpoint contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Verified `QuizNode` model in `backend/api/models.py` uses one-way FK to `Quiz` and inherits BaseNode tree behavior. | ✅ | 2026-04-01 |
| TASK-002 | Verified task contract and route conventions from implementation docs before coding. | ✅ | 2026-04-01 |
| TASK-003 | Defined serializer constraints for folder-only MVP payloads. | ✅ | 2026-04-01 |

### Implementation Phase 2

- GOAL-002: Implement QuizNode API handlers and routes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Added `QuizNodeSerializer` with folder-only validation, path rebuild logic, and children metadata in `backend/api/serializers.py`. | ✅ | 2026-04-01 |
| TASK-005 | Added `QuizNodeViewSet` with root list, children action, move action, and role-aware mutation handlers in `backend/api/views/quizzes.py`. | ✅ | 2026-04-01 |
| TASK-006 | Added namespaced QuizNode routes in `backend/api/urls.py` and exported viewset in `backend/api/views/__init__.py`. | ✅ | 2026-04-01 |

### Implementation Phase 3

- GOAL-003: Verify behavior and sync project docs.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Added Task 7.2 integration tests for root list, children load, cycle prevention, and subtree delete in `backend/api/test_quiz_task7_1.py`. | ✅ | 2026-04-01 |
| TASK-008 | Added permission test ensuring Member cannot create QuizNode while Editor can mutate tree. | ✅ | 2026-04-01 |
| TASK-009 | Updated API and status docs to include Task 7.2 endpoints and completion note. | ✅ | 2026-04-01 |

## 3. Alternatives

- ALT-001: Use nested routes under `/api/quiz/quizzes/{id}/nodes/*`. Rejected due current data model and PRD endpoint shape using global `/api/quiz/nodes/*`.
- ALT-002: Support item-node semantics in this task. Rejected by approved MVP scope (folder-only).
- ALT-003: Add configurable max-depth in this task. Rejected because BaseNode behavior is sufficient for current scope.

## 4. Dependencies

- DEP-001: `backend/api/models.py`
- DEP-002: `backend/api/serializers.py`
- DEP-003: `backend/api/views/quizzes.py`
- DEP-004: `backend/api/views/__init__.py`
- DEP-005: `backend/api/urls.py`
- DEP-006: `backend/api/test_quiz_task7_1.py`
- DEP-007: `docs/API.md`
- DEP-008: `docs/STATUS.md`

## 5. Files

- FILE-001: `backend/api/serializers.py` - Added `QuizNodeSerializer`.
- FILE-002: `backend/api/views/quizzes.py` - Added `QuizNodeViewSet`.
- FILE-003: `backend/api/views/__init__.py` - Exported `QuizNodeViewSet`.
- FILE-004: `backend/api/urls.py` - Added `/api/quiz/nodes/*` routes.
- FILE-005: `backend/api/test_quiz_task7_1.py` - Added Task 7.2 integration tests.
- FILE-006: `docs/API.md` - Added active QuizNode endpoint docs.
- FILE-007: `docs/STATUS.md` - Marked Task 7.2 complete.
- FILE-008: `openmemory.md` - Added implementation memory note.

## 6. Testing

- TEST-001: Editor can create root node and list root nodes.
- TEST-002: Editor can create child node and lazy-load children.
- TEST-003: Member cannot create node (403).
- TEST-004: Cycle move attempt is rejected with 400.
- TEST-005: Deleting parent node deletes subtree.
- TEST-006: Regression run for Task 7.1 + Task 7.2 test module passes.

## 7. Risks & Assumptions

- RISK-001: Existing `QuizNode.quiz` one-to-one structure may require future extension when item-link semantics are introduced.
- RISK-002: Route contract may need normalization if product decides per-quiz tree scoping in later slice.
- ASSUMPTION-001: Folder-only MVP is accepted for current Slice 7 execution.
- ASSUMPTION-002: No migration required for Task 7.2.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/API.md
- docs/prd/05-quiz.md
