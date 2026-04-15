---
goal: Slice 5 Task 5.2 Learn CourseNode tree API
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend API Team
status: 'Planned'
tags: [feature, learn, api, slice5, backend]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 5 Task 5.2 to deliver a canonical Learn course tree API (CourseNode folder + lesson item nodes) under `/api/learn/courses/{slug}/nodes/*`. It aligns runtime behavior with `docs/IMPL_PLAN.md` Task 5.2 and `docs/prd/03-learn.md` FR-LEARN-03/08 while respecting existing repository structure.

## 1. Requirements & Constraints

- **REQ-001**: Implement the Task 5.2 endpoint contract exactly as specified in `docs/IMPL_PLAN.md`:
  - `GET  /api/learn/courses/{slug}/nodes/` → root nodes (`parent=null`)
  - `GET  /api/learn/courses/{slug}/nodes/{id}/children/` → lazy load children
  - `POST /api/learn/courses/{slug}/nodes/` → create folder or lesson item node
  - `PUT  /api/learn/courses/{slug}/nodes/{node_id}/` → rename/reorder/move
  - `DELETE /api/learn/courses/{slug}/nodes/{node_id}/` → delete node + subtree
- **REQ-002**: Enforce dot-separated `path` semantics per `docs/DATA_MODEL.md` §4.3:
  - Root node: `path=""`
  - Child node: `path = parent.path + "." + parent.id` (or `str(parent.id)` if `parent.path==""`)
  - On move: update `path` for the node and all descendants
- **REQ-003**: Move operations must update descendant paths via `bulk_update` (no per-descendant `.save()` recursion) as mandated by `docs/IMPL_PLAN.md` Task 5.2.
- **REQ-004**: Lesson item node creation must be one-step atomic (create `Lesson` + `CourseNode` in a single DB transaction) per `docs/DECISIONS.md` Q-LEARN-01 and PRD FR-LEARN-03.
- **REQ-005**: Enforce `system_config[learn.max_tree_depth]` on node create (and on move) per `docs/prd/03-learn.md` FR-LEARN-08 and `docs/CONFIG.md`.
- **REQ-006**: `course.structure_version` must increment on any node create/update/move/delete to invalidate versioned progress caches (Task 5.4). If the field is missing in `backend/api/models.py`, add it and a migration.
- **SEC-001**: All new endpoints must enforce `permission_classes = [IsAuthenticated, HasJWTPermission]`.
- **SEC-002**: Read access must respect Learn visibility rules:
  - Admin/Editor: can read nodes for any course status
  - Member: can read nodes only for `Course.status='published'` (draft/archived should behave as not found)
- **SEC-003**: Write access must be Editor+ (Admin/Editor) for create/update/delete/move.
- **CON-001**: Follow existing namespaced learn route wiring style in `backend/api/urls.py` using `re_path` (do not introduce a new router for nested resources).
- **CON-002**: Use existing service-layer pattern: implement tree business logic in `backend/api/services/course_service.py` and keep views thin.
- **CON-003**: Preserve legacy endpoints and serializers used by `CourseViewSet.tree` (do not break `/api/courses/{id}/tree/` behavior).
- **GUD-001**: After implementing endpoints, synchronize `docs/API.md`, `docs/STATUS.md`, and (only if wording differs) `docs/IMPL_PLAN.md` in the same session.
- **PAT-001**: Follow the lazy-tree serializer pattern used by `QuizNodeSerializer` (`has_children` boolean, `children` fetched via `children/` endpoint).
- **PAT-002**: Use `api.utils.get_config('learn.max_tree_depth', default=5)` for runtime depth validation.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align `Course` model with `docs/DATA_MODEL.md` by adding `structure_version` for downstream progress invalidation.
- VAL-001: `Course` ORM has a non-null `structure_version` integer field with default `1`, and migrations apply cleanly on SQLite.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In `backend/api/models.py`, add `structure_version = models.IntegerField(default=1, db_column='structure_version')` to `class Course` (near other core fields). |  |  |
| TASK-002 | Create a new Django migration in `backend/api/migrations/` to add `course.structure_version` with `DEFAULT 1` and `NOT NULL`. |  |  |
| TASK-003 | Ensure `python backend/manage.py makemigrations api` produces only the intended migration change and `python backend/manage.py migrate` applies it successfully in dev DB. |  |  |

### Implementation Phase 2

- GOAL-002: Add canonical lazy-tree serializers for Learn node endpoints without breaking legacy `CourseNodeSerializer`.
- VAL-002: Node list responses do not recursively embed all descendants; consumers can rely on `has_children` and call `children/`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | In `backend/api/serializers/course.py`, keep existing `CourseNodeSerializer` unchanged for legacy `/api/courses/{id}/tree/` usage. |  |  |
| TASK-005 | In `backend/api/serializers/course.py`, add `LearnCourseNodeSerializer` with fields: `id`, `parent`, `is_item`, `title`, `position`, `path`, `has_children`, `lesson` (optional summary). `has_children` must be derived without N+1 queries (use annotated `children_count` or similar). |  |  |
| TASK-006 | In `backend/api/serializers/course.py`, add `LearnCourseNodeWriteSerializer` validating payload: `title` (required), `parent_id` (nullable), `position` (optional), `is_item` (required); if `is_item=false` then no `lesson`; if `is_item=true` then `lesson` contains `title`, `lesson_type` (`markdown|video|miniquiz`) with type-specific constraints (`content_md` required for markdown, `video_url` required for video); do not allow attaching existing Lesson by id in Task 5.2 (atomic create only). |  |  |

### Implementation Phase 3

- GOAL-003: Implement course-scoped node operations (visibility checks, depth enforcement, move bulk_update, subtree delete, structure_version bump) in the service layer.
- VAL-003: All node mutations bump `Course.structure_version` exactly once per request, and move/delete operations keep `path` consistent for the entire subtree.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | In `backend/api/services/course_service.py`, add `get_visible_course_by_slug(slug, user)` that returns the course if visible to `user` (Member: only published; Admin/Editor: any). Raise `Course.DoesNotExist` for non-visible courses to produce a 404. |  |  |
| TASK-008 | In `backend/api/services/course_service.py`, add `get_course_node_or_404(course, node_id)` ensuring the node exists and `node.course_id == course.id`. |  |  |
| TASK-009 | In `backend/api/services/course_service.py`, add `compute_node_path(parent)` returning the correct dot-separated `path` string for a node under `parent` (or empty string for root). |  |  |
| TASK-010 | In `backend/api/services/course_service.py`, add `validate_max_depth(parent, max_depth)` where `max_depth = get_config('learn.max_tree_depth', 5)`. Depth formula must match `docs/DATA_MODEL.md`: `depth = 0 if path=="" else path.count('.') + 1`. Reject with `ValueError('Maximum folder depth exceeded')` when creating/moving beyond limit. |  |  |
| TASK-011 | In `backend/api/services/course_service.py`, add `bump_course_structure_version(course_id)` implemented as `Course.objects.filter(id=course_id).update(structure_version=F('structure_version') + 1)`. |  |  |
| TASK-012 | In `backend/api/services/course_service.py`, add `create_course_node_atomic(course, payload, actor)` performing: validate parent (same course, not item), enforce max depth, create Lesson+CourseNode in `transaction.atomic()` when `is_item=true`, set `node.path` from parent without recursive rebuild, then bump `course.structure_version`; return created node. |  |  |
| TASK-013 | In `backend/api/services/course_service.py`, add `move_course_node_bulk(node, new_parent)` performing: validate same-course/non-item parent and acyclic move, enforce max depth for resulting subtree, update `node.parent`+`node.path`, fetch descendants by `path__startswith=old_prefix`, recompute descendant paths by prefix replacement, persist via `bulk_update(descendants, ['path','updated_at'])`, then bump `course.structure_version`. |  |  |
| TASK-014 | In `backend/api/services/course_service.py`, add `delete_course_node_subtree(course, node)` performing: compute subtree node ids, extract lesson ids, delete lessons (to cascade-delete item nodes), delete remaining nodes by ids (folders), then bump `course.structure_version`. |  |  |

### Implementation Phase 4

- GOAL-004: Add `LearnCourseNodeViewSet` and wire URLs for the canonical `/api/learn/courses/{slug}/nodes/*` surface.
- VAL-004: All Task 5.2 endpoints resolve and enforce scoping/permissions/visibility.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | In `backend/api/views/courses.py`, add `LearnCourseNodeViewSet(viewsets.ViewSet)` with `permission_classes = [IsAuthenticated, HasJWTPermission]` and `@add_role_granted('Admin','Editor','Member')` on the class. |  |  |
| TASK-016 | In `backend/api/views/courses.py`, implement `list(request, slug)` for root nodes: resolve `course` via `CourseService.get_visible_course_by_slug`, then return `CourseNode` rows with `course_id=course.id` and `parent__isnull=True`, ordered by `position,id`, using `LearnCourseNodeSerializer`. |  |  |
| TASK-017 | In `backend/api/views/courses.py`, implement `children(request, slug, pk)` as a `@action(detail=True, methods=['get'])`-style handler wired via `as_view({'get':'children'})`: resolve `course`, then resolve `node` via `CourseService.get_course_node_or_404`, then list `CourseNode` children ordered by `position,id`. |  |  |
| TASK-018 | In `backend/api/views/courses.py`, implement `create(request, slug)` (Editor+ only via `@add_role_granted('Admin','Editor')`) using `LearnCourseNodeWriteSerializer` + `CourseService.create_course_node_atomic`, then respond with `LearnCourseNodeSerializer`. |  |  |
| TASK-019 | In `backend/api/views/courses.py`, implement `update(request, slug, pk)` (Editor+ only) that supports rename/reorder/move by accepting `title`, `position`, and `parent_id`. If `parent_id` changes, call `CourseService.move_course_node_bulk`; otherwise apply field updates and bump structure_version once. |  |  |
| TASK-020 | In `backend/api/views/courses.py`, implement `destroy(request, slug, pk)` (Editor+ only) calling `CourseService.delete_course_node_subtree`. Return `204`. |  |  |
| TASK-021 | In `backend/api/views/__init__.py`, export `LearnCourseNodeViewSet` and add it to `__all__` so `backend/api/urls.py` can import it. |  |  |
| TASK-022 | In `backend/api/urls.py`, add `re_path` entries for: nodes list/create (`.../nodes/`), node update/delete (`.../nodes/{pk}/`), and node children (`.../nodes/{pk}/children/`) mapped to `LearnCourseNodeViewSet.as_view(...)`. |  |  |

### Implementation Phase 5

- GOAL-005: Add regression tests for the new learn node endpoints.
- VAL-005: `pytest` passes for the new module and does not regress existing Learn/Quiz suites.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Create `backend/api/tests/test_learn_course_node_api.py` (pytest integration) with fixtures for `published_course` and `draft_course` and role assignment helper (reuse patterns from `backend/api/tests/test_learn_course_api.py`). |  |  |
| TASK-024 | Add tests proving visibility enforcement: Member can list nodes for a published course; Member gets `404` for a draft course; Editor can list nodes for a draft course. |  |  |
| TASK-025 | Add tests for atomic lesson-node creation: Editor can create a folder node (`is_item=false`) and can create a lesson item node (`is_item=true`) that persists both `Lesson` and `CourseNode.lesson_id`. |  |  |
| TASK-026 | Add tests for move bulk behavior: create a subtree (depth >= 2), move the parent folder under another root folder, assert moved node `path` and descendant `path` values update to the expected new prefixes. |  |  |
| TASK-027 | Add tests for max depth enforcement: set `SystemConfig(key='learn.max_tree_depth')` to a small value and assert create/move beyond depth returns `400` with deterministic error text. |  |  |
| TASK-028 | Add tests for subtree delete correctness: deleting a folder node deletes all descendant nodes and deletes lessons attached to descendant item nodes (no orphan lessons). |  |  |
| TASK-029 | Execute: `pytest backend/api/tests/test_learn_course_node_api.py -q`, then also run `pytest backend/api/tests/test_learn_course_api.py -q` and `pytest backend/api/tests/test_quiz_api.py -q` to confirm no regressions. |  |  |

### Implementation Phase 6

- GOAL-006: Synchronize canonical docs after implementation.
- VAL-006: Docs reflect active maturity for the new endpoints and Slice 5 status is updated.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-030 | Update `docs/API.md` to add `/api/learn/courses/{slug}/nodes/*` endpoints to the Learn section with correct maturity tags and notes on lazy children loading and Editor+ write access. |  |  |
| TASK-031 | Update `docs/STATUS.md` Slice 5 section to mark “CourseNode tree API” as completed only after TASK-029 passes. |  |  |
| TASK-032 | If any implementation detail differs from `docs/IMPL_PLAN.md` Task 5.2 (for example move endpoint shape), update `docs/IMPL_PLAN.md` in the same session to match runtime behavior. |  |  |
| TASK-033 | Create a session report in `docs/reports/YYYY-MM-DD_slice5-task5-2-course-node-tree-api.md` capturing key algorithms: bulk path update, depth validation, and subtree delete lesson cleanup. |  |  |

## 3. Alternatives

- **ALT-001**: Reuse `BaseNode.move_to()` and `rebuild_path()` recursion for move operations. Rejected because Task 5.2 explicitly requires descendant `path` updates via `bulk_update`.
- **ALT-002**: Implement a separate `/move/` endpoint (like QuizNode) and a separate `/reorder/` endpoint (like PRD examples). Rejected to keep the route surface aligned with `docs/IMPL_PLAN.md` Task 5.2 (single `PUT` for move/reorder/rename).
- **ALT-003**: Introduce an explicit hidden root node per PRD FR-LEARN-03. Rejected because current implementation plan defines root nodes as `parent=null` and changing this would add migration/UX complexity.

## 4. Dependencies

- **DEP-001**: `Course`, `CourseNode`, `Lesson` models in `backend/api/models.py`.
- **DEP-002**: Permission system: `auth_app.permissions.HasJWTPermission` and `add_role_granted`.
- **DEP-003**: Runtime config read helper `api.utils.get_config` and seeded key `learn.max_tree_depth` in `backend/api/management/commands/seed_config.py`.
- **DEP-004**: Tree API patterns from `QuizNodeViewSet` and `QuizNodeSerializer` for lazy child loading.
- **DEP-005**: Pytest fixtures `admin_client`, `editor_client`, `member_client` in `backend/conftest.py`.

## 5. Files

- **FILE-001**: `backend/api/models.py` — add `Course.structure_version`.
- **FILE-002**: `backend/api/migrations/*` — migration adding `structure_version`.
- **FILE-003**: `backend/api/serializers/course.py` — add `LearnCourseNodeSerializer` + `LearnCourseNodeWriteSerializer` (keep legacy `CourseNodeSerializer`).
- **FILE-004**: `backend/api/services/course_service.py` — add course/node visibility, depth validation, atomic create, bulk move, subtree delete, and structure_version bump.
- **FILE-005**: `backend/api/views/courses.py` — add `LearnCourseNodeViewSet`.
- **FILE-006**: `backend/api/views/__init__.py` — export the new viewset.
- **FILE-007**: `backend/api/urls.py` — wire `/api/learn/courses/{slug}/nodes/*` routes via `re_path`.
- **FILE-008**: `backend/api/tests/test_learn_course_node_api.py` — new integration tests.
- **FILE-009**: `docs/API.md` — endpoint inventory update.
- **FILE-010**: `docs/STATUS.md` — mark Task 5.2 completion after tests.
- **FILE-011**: `docs/reports/*` — add session report when the implementation session completes.

## 6. Testing

- **TEST-001**: Node visibility tests (Member published-only, Editor draft OK).
- **TEST-002**: Atomic create tests (Lesson + node created together).
- **TEST-003**: Move tests (subtree path prefix replacement; no cycles).
- **TEST-004**: Max depth tests (create and move reject beyond configured depth).
- **TEST-005**: Subtree delete tests (no orphan lessons remain).
- **TEST-006**: Command validation: `pytest backend/api/tests/test_learn_course_node_api.py -q` passes.
- **TEST-007**: Regression validation: `pytest backend/api/tests/test_learn_course_api.py -q` and `pytest backend/api/tests/test_quiz_api.py -q` pass.

## 7. Risks & Assumptions

- **RISK-001**: `BaseNode` currently uses recursive `rebuild_path()`; introducing a separate bulk move path for `CourseNode` risks divergence from `QuizNode` behavior. Mitigation: keep bulk move logic encapsulated in `CourseService.move_course_node_bulk` and cover with tests.
- **RISK-002**: `CourseNode.lesson` relationship is modeled as `OneToOneField` from node to lesson; deleting nodes does not automatically delete lessons, so subtree delete must explicitly delete lessons to avoid orphans.
- **RISK-003**: `docs/RELEASE_CHECKLIST_SLICE5_8.md` contains an Outline sync note that may conflict with newer Slice 5 decisions (sync blocking MVP). This does not block Task 5.2 but may require a docs normalization pass later.
- **ASSUMPTION-001**: Existing `seed_config` has already populated `learn.max_tree_depth` (default `5`) in dev and test DBs.
- **ASSUMPTION-002**: Role grants (`Admin`, `Editor`, `Member`) exist or are created by test helpers; RBAC enforcement is active via `HasJWTPermission`.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/DATA_MODEL.md](../docs/DATA_MODEL.md)
[docs/CONFIG.md](../docs/CONFIG.md)
[docs/API.md](../docs/API.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
