---
goal: Slice 5 Task 5.3 Learn Lesson CRUD + Miniquiz Question Mapping API
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend API Team
status: 'Planned'
tags: [feature, learn, lessons, api, slice5, backend]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 5 Task 5.3 to deliver canonical, namespaced Learn lesson endpoints under `/api/learn/lessons/*`, including mini-quiz question mapping management via `lesson_question` while keeping existing legacy-flat `/api/lessons/*` runtime endpoints operational.

## 1. Requirements & Constraints

- **REQ-001**: Implement Task 5.3 endpoint contract exactly as defined in `docs/IMPL_PLAN.md`:
  - `GET  /api/learn/lessons/{id}/` → lesson detail (course visibility enforced)
  - `PUT  /api/learn/lessons/{id}/` → lesson update (Editor+)
  - `GET  /api/learn/lessons/{id}/questions/` → list mapped quiz questions (ordered)
  - `POST /api/learn/lessons/{id}/questions/` → attach an existing `quiz_question` to lesson (Editor+)
  - `GET  /api/learn/lesson-questions/{id}/` → mapping detail
  - `PUT  /api/learn/lesson-questions/{id}/` → mapping update (position) (Editor+)
  - `DELETE /api/learn/lesson-questions/{id}/` → mapping delete (Editor+)
- **REQ-002**: Enforce Learn visibility rules for lesson read:
  - Admin/Editor: can read lessons under any course status
  - Member: can read lessons only when the owning course has `status='published'`; otherwise respond as `404`.
- **REQ-003**: Lesson creation remains coupled to Task 5.2 item-node creation (atomic `Lesson + CourseNode`). Task 5.3 MUST NOT add a new standalone lesson create endpoint.
- **REQ-004**: Mini-quiz uses shared `quiz_question` via `lesson_question` mapping (no duplication of question content).
- **REQ-005**: Question mapping endpoints MUST reject non-mini-quiz lessons with deterministic `400` error payload.
- **REQ-006**: The question attach flow MUST support adding an existing `QuizQuestion` by id (because `QuizQuestion.quiz_id` is required in the current data model and runtime implementation).
- **SEC-001**: All new namespaced lesson endpoints MUST enforce `permission_classes = [IsAuthenticated, HasJWTPermission]`.
- **SEC-002**: New endpoints MUST use role grants consistent with other Slice 5 APIs:
  - Read: `@add_role_granted('Admin','Editor','Member')`
  - Write (lesson update, attach/update/delete mapping): `@add_role_granted('Admin','Editor')`
- **SEC-003**: Lesson question list responses MUST NOT expose correctness signals (`is_correct`) or accepted answers; they MUST reuse the safe read serializer pattern used for quiz public question payloads.
- **API-001**: Preserve legacy-flat lesson routes (`/api/lessons/*`) and behavior during Task 5.3; do not remove router registrations.
- **CON-001**: Follow namespaced route wiring pattern in `backend/api/urls.py` using explicit `re_path` entries (same style as `/api/learn/courses/*`).
- **CON-002**: Follow service-layer separation: views must be thin and delegate visibility/validation to service functions.
- **CON-003**: Outline sync endpoints are explicitly extracted to Task 5.8; Task 5.3 MUST NOT introduce any Outline client code or endpoints.
- **GUD-001**: Follow `DEV_WORKFLOW.md` and `CLAUDE.md` session process during implementation: claim Task 5.3 in `docs/STATUS.md` before coding, run pytest, then update docs and write a session report.
- **PAT-001**: Use the same authorization primitives used elsewhere: `auth_app.permissions.HasJWTPermission` and `auth_app.permissions.add_role_granted`.
- **PAT-002**: Use deterministic error payloads with a top-level `detail` key for non-field errors.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add lesson visibility and lesson-question mapping operations in the service layer.
- VAL-001: A single service entrypoint can resolve a visible `Lesson` for a user (Member published-only) and can perform attach/update/delete operations for `LessonQuestion` deterministically.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `backend/api/services/lesson_service.py` defining `class LessonService:`. |  |  |
| TASK-002 | In `LessonService`, implement `is_editor_or_admin(user) -> bool` mirroring `CourseService.is_editor_or_admin` logic (superuser OR role in Admin/Editor). |  |  |
| TASK-003 | In `LessonService`, implement `get_visible_lesson_by_id(lesson_id: int, user) -> Lesson` using `Lesson.objects.select_related('node__course').get(id=lesson_id)` and enforcing: (a) lesson must have an associated `CourseNode` (`lesson.node` exists), (b) Member access requires `lesson.node.course.status == Course.Status.PUBLISHED`. Raise `Lesson.DoesNotExist` for non-visible lessons so views can return `404`. |  |  |
| TASK-004 | In `LessonService`, implement `require_miniquiz(lesson)` raising `ValueError('Lesson is not a miniquiz.')` when `lesson.lesson_type != Lesson.LessonType.MINIQUIZ`. |  |  |
| TASK-005 | In `LessonService`, implement `list_lesson_questions(lesson) -> QuerySet[LessonQuestion]` returning mappings ordered by `position,id` and prefetching `question` and `question.options` (and `question.answers` for fill_blank) to avoid N+1. |  |  |
| TASK-006 | In `LessonService`, implement `attach_question(lesson, question_id: int, position: int | None, actor) -> LessonQuestion` that validates question exists, applies `position` defaulting to `(max_position + 1)`, and handles unique constraint collisions with deterministic error: raise `IntegrityError` or `ValueError('Question already attached to lesson.')`. |  |  |
| TASK-007 | In `LessonService`, implement `update_mapping_position(mapping: LessonQuestion, position: int, actor) -> LessonQuestion` updating `position` and `updated_by`/`updated_at` deterministically. |  |  |
| TASK-008 | In `LessonService`, implement `delete_mapping(mapping: LessonQuestion) -> None` deleting the mapping row only (must not delete the underlying `QuizQuestion`). |  |  |
| TASK-009 | Update `backend/api/services/__init__.py` to export `LessonService` in `__all__` so view modules can import it consistently. |  |  |

### Implementation Phase 2

- GOAL-002: Add request/response serializers for namespaced lesson detail and lesson-question mapping.
- VAL-002: Lesson PUT validates type-specific constraints; question list responses do not expose `is_correct`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | In `backend/api/serializers/course.py`, add `LearnLessonDetailSerializer(serializers.ModelSerializer)` exposing fields: `id`, `title`, `lesson_type`, `source`, `content_md`, `video_url`, `video_duration`, `learning_point`, `learning_time`. |  |  |
| TASK-011 | In `backend/api/serializers/course.py`, add `LearnLessonUpdateSerializer(serializers.ModelSerializer)` for PUT updates with allowed fields: `title`, `content_md`, `video_url`, `video_duration`, `learning_point`, `learning_time`. Validation rules must match `docs/DATA_MODEL.md` lesson type rules: markdown requires `content_md`, video requires `video_url`, miniquiz forbids requiring either content field. |  |  |
| TASK-012 | In `backend/api/serializers/course.py`, add `LearnLessonQuestionSerializer(serializers.ModelSerializer)` for `LessonQuestion` with fields: `id`, `lesson`, `question`, `position` where `question` uses `api.serializers.quiz.QuizQuestionSerializer` (read-only, safe fields only). |  |  |
| TASK-013 | In `backend/api/serializers/course.py`, add `LearnLessonQuestionAttachSerializer(serializers.Serializer)` with input fields: `question_id` (int, required), `position` (int, optional, min_value=0). |  |  |
| TASK-014 | In `backend/api/serializers/course.py`, add `LearnLessonQuestionUpdateSerializer(serializers.Serializer)` with input field `position` (int, required, min_value=0). |  |  |
| TASK-015 | Update `backend/api/serializers/__init__.py` exports to include the new serializers so view modules can import them from `api.serializers` consistently. |  |  |

### Implementation Phase 3

- GOAL-003: Implement namespaced lesson endpoints in views and wire URLs.
- VAL-003: All `/api/learn/lessons/*` routes resolve, enforce visibility, and enforce Editor+ writes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | In `backend/api/views/courses.py`, add `LearnLessonViewSet(viewsets.ViewSet)` with `permission_classes = [IsAuthenticated, HasJWTPermission]` and class decorator `@add_role_granted('Admin','Editor','Member')`. |  |  |
| TASK-017 | In `LearnLessonViewSet`, implement `retrieve(request, pk)` calling `LessonService.get_visible_lesson_by_id(pk, request.user)` and returning `LearnLessonDetailSerializer(lesson).data`. |  |  |
| TASK-018 | In `LearnLessonViewSet`, implement `update(request, pk)` guarded by `@add_role_granted('Admin','Editor')`. It must: resolve visible lesson (Editor/Admin can resolve even if course is draft), validate request with `LearnLessonUpdateSerializer(lesson, data=request.data, partial=True)`, save, and return `LearnLessonDetailSerializer(lesson).data`. |  |  |
| TASK-019 | In `LearnLessonViewSet`, implement `questions(request, pk)` handling GET/POST on `/api/learn/lessons/{id}/questions/`:
  - GET: resolve visible lesson, `LessonService.require_miniquiz`, serialize `LessonService.list_lesson_questions(lesson)` via `LearnLessonQuestionSerializer(many=True)`.
  - POST (Editor+): validate with `LearnLessonQuestionAttachSerializer`, resolve visible lesson, require miniquiz, call `LessonService.attach_question`, return created mapping with `201`.
  - On duplicate attach, return `409` with `{ "detail": "Question already attached to lesson." }`.
 |  |  |
| TASK-020 | In `backend/api/views/courses.py`, add `LearnLessonQuestionViewSet(viewsets.ViewSet)` with `permission_classes = [IsAuthenticated, HasJWTPermission]` and class decorator `@add_role_granted('Admin','Editor','Member')`.
 |  |  |
| TASK-021 | In `LearnLessonQuestionViewSet`, implement `retrieve(request, pk)` returning mapping detail via `LearnLessonQuestionSerializer`.
 |  |  |
| TASK-022 | In `LearnLessonQuestionViewSet`, implement `update(request, pk)` guarded by `@add_role_granted('Admin','Editor')`, validating with `LearnLessonQuestionUpdateSerializer`, updating mapping position via `LessonService.update_mapping_position`, and returning the updated mapping serializer.
 |  |  |
| TASK-023 | In `LearnLessonQuestionViewSet`, implement `destroy(request, pk)` guarded by `@add_role_granted('Admin','Editor')`, deleting mapping via `LessonService.delete_mapping`, returning `204`.
 |  |  |
| TASK-024 | Update `backend/api/views/__init__.py` to export `LearnLessonViewSet` and `LearnLessonQuestionViewSet` in imports and `__all__`.
 |  |  |
| TASK-025 | Update `backend/api/urls.py` to add explicit `re_path` entries:
  - `^learn/lessons/(?P<pk>\d+)/$` → `LearnLessonViewSet.as_view({'get':'retrieve','put':'update'})`
  - `^learn/lessons/(?P<pk>\d+)/questions/$` → `LearnLessonViewSet.as_view({'get':'questions','post':'questions'})`
  - `^learn/lesson-questions/(?P<pk>\d+)/$` → `LearnLessonQuestionViewSet.as_view({'get':'retrieve','put':'update','delete':'destroy'})`
  Keep legacy router registration `router.register(r'lessons', LessonViewSet, ...)` unchanged.
 |  |  |

### Implementation Phase 4

- GOAL-004: Add regression tests for lesson visibility, lesson update, and miniquiz question mapping.
- VAL-004: New test module passes and existing Slice 5 suites remain green.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Create `backend/api/tests/test_learn_lesson_api.py` and mark `pytestmark = pytest.mark.integration`.
 |  |  |
| TASK-027 | Add fixtures in `test_learn_lesson_api.py` to create: (a) `published_course` and `draft_course`, (b) `markdown_lesson_node` under published course, (c) `miniquiz_lesson_node` under published course, and (d) `draft_course_lesson_node` under draft course. Use `CourseNode(lesson=Lesson(...), course=...)` patterns consistent with existing Slice 5 tests.
 |  |  |
| TASK-028 | Add tests for visibility: Member with role `Member` can `GET /api/learn/lessons/{id}/` for published-course lesson; Member receives `404` for draft-course lesson; Editor receives `200` for draft-course lesson.
 |  |  |
| TASK-029 | Add tests for update: Editor with role `Editor` can `PUT /api/learn/lessons/{id}/` to update markdown `content_md` and title; Member receives `403` on PUT.
 |  |  |
| TASK-030 | Add tests for question endpoints (miniquiz): Editor can `POST /api/learn/lessons/{id}/questions/` with an existing `QuizQuestion` id and receives `201`; `GET` returns ordered mappings with nested `question` payload. Duplicate attach returns `409`.
 |  |  |
| TASK-031 | Add tests that non-miniquiz lessons reject question endpoints with deterministic `400` `{detail: "Lesson is not a miniquiz."}`.
 |  |  |
| TASK-032 | Execute: `pytest backend/api/tests/test_learn_lesson_api.py -q`, then also run `pytest backend/api/tests/test_learn_course_api.py -q` and `pytest backend/api/tests/test_learn_course_node_api.py -q` to confirm no regressions.
 |  |  |

### Implementation Phase 5

- GOAL-005: Synchronize canonical documentation and session artifacts after implementation.
- VAL-005: Docs and trackers reflect the new namespaced endpoints and Task 5.3 completion status.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-033 | Update `docs/API.md` by adding canonical namespaced Learn lesson routes under the Learn section (or a new subsection) and marking them `Partial` until Task 5.4 progress endpoints exist. Keep legacy `/api/lessons/*` subsection labeled historical/runtime-legacy.
 |  |  |
| TASK-034 | Update `docs/STATUS.md` Slice 5 section to mark “Lesson CRUD (Task 5.3)” as completed only after TASK-032 passes.
 |  |  |
| TASK-035 | If implementation details differ from `docs/IMPL_PLAN.md` Task 5.3 (for example, attach payload shape), update `docs/IMPL_PLAN.md` in the same session to match runtime behavior.
 |  |  |
| TASK-036 | Create a session report in `docs/reports/YYYY-MM-DD_slice5-task5-3-lesson-crud-api.md` describing key flows: lesson visibility resolution via CourseNode→Course, miniquiz mapping attach ordering, and deterministic error handling.
 |  |  |
| TASK-037 | Update `openmemory.md` and store at least one OpenMemory MCP entry describing the Task 5.3 API surface and the visibility + mapping patterns.
 |  |  |

## 3. Alternatives

- **ALT-001**: Extend the existing legacy `LessonViewSet` at `/api/lessons/*` to support PUT and question mapping. Rejected because new implementation work must target namespaced Learn routes (`docs/API_ROUTE_MAPPING.md`).
- **ALT-002**: Add a standalone `POST /api/learn/lessons/` create endpoint. Rejected because Slice 5 creates lessons atomically through CourseNode item creation (`Task 5.2`) and the PRD expects lesson creation to be tree-structured.
- **ALT-003**: Allow creating `QuizQuestion` records from lesson endpoints. Rejected because `QuizQuestion` requires `quiz_id` and Task 5.3 scope only requires mapping existing questions (`lesson_question`) to lessons.
- **ALT-004**: Expose full `QuizQuestionManageSerializer` (including correctness) in lesson question list responses. Rejected for security and to keep member-facing payload safe by default.

## 4. Dependencies

- **DEP-001**: Models in `backend/api/models.py`: `Lesson`, `CourseNode`, `Course`, `LessonQuestion`, `QuizQuestion`.
- **DEP-002**: Permission framework: `auth_app.permissions.HasJWTPermission` and `add_role_granted`.
- **DEP-003**: Existing Learn route wiring style in `backend/api/urls.py` using explicit `re_path` entries.
- **DEP-004**: Existing quiz question read serializer `QuizQuestionSerializer` in `backend/api/serializers/quiz.py` (safe option payload without `is_correct`).
- **DEP-005**: Pytest fixtures and role assignment helpers used in Slice 5 tests (`backend/api/tests/test_learn_course_api.py`).

## 5. Files

- **FILE-001**: `backend/api/services/lesson_service.py` — add `LessonService` for visibility and mapping operations.
- **FILE-002**: `backend/api/services/__init__.py` — export `LessonService`.
- **FILE-003**: `backend/api/serializers/course.py` — add Learn lesson serializers and lesson-question serializers.
- **FILE-004**: `backend/api/serializers/__init__.py` — export new serializers.
- **FILE-005**: `backend/api/views/courses.py` — add `LearnLessonViewSet` and `LearnLessonQuestionViewSet`.
- **FILE-006**: `backend/api/views/__init__.py` — export new viewsets.
- **FILE-007**: `backend/api/urls.py` — wire `/api/learn/lessons/*` and `/api/learn/lesson-questions/*` routes.
- **FILE-008**: `backend/api/tests/test_learn_lesson_api.py` — integration test coverage for Task 5.3.
- **FILE-009**: `docs/API.md` — add namespaced Learn lesson endpoints and clarify legacy routes.
- **FILE-010**: `docs/STATUS.md` — mark Task 5.3 completion after tests pass.
- **FILE-011**: `docs/reports/*` — add Task 5.3 session report on completion.
- **FILE-012**: `openmemory.md` — update project index when Task 5.3 is implemented.

## 6. Testing

- **TEST-001**: Visibility tests: Member published-only lesson access; Editor draft-course access; non-associated lessons return 404.
- **TEST-002**: Update tests: Editor PUT updates markdown/video content; invalid payload returns `400` with field errors.
- **TEST-003**: Miniquiz mapping tests: attach existing question, list ordered mappings, duplicate attach returns `409`, non-miniquiz returns `400`.
- **TEST-004**: Command validation: `pytest backend/api/tests/test_learn_lesson_api.py -q` passes.
- **TEST-005**: Regression validation: `pytest backend/api/tests/test_learn_course_api.py -q` and `pytest backend/api/tests/test_learn_course_node_api.py -q` pass.

## 7. Risks & Assumptions

- **RISK-001**: `Lesson` in runtime code does not currently include the `status` field specified by `docs/DATA_MODEL.md`. Task 5.3 will enforce course-level visibility only; lesson-level draft hiding may need to be implemented in a follow-up normalization session.
- **RISK-002**: The release checklist states Outline sync is async-queue based, while Slice 5 decisions (`Q-LEARN-10`) indicate synchronous blocking for MVP. Task 5.3 avoids Outline entirely, but future Task 5.8 must reconcile this doc conflict.
- **RISK-003**: Because `QuizQuestion` is scoped to a `Quiz` (`quiz_id` required), miniquiz question reuse depends on an external authoring workflow (create questions in a quiz first). This may affect UX expectations for Task 5.7.
- **ASSUMPTION-001**: `HasJWTPermission` and role grants remain compatible with the current test approach (role assignment via `Role` + `UserRole`).
- **ASSUMPTION-002**: Lesson records accessed via `/api/learn/lessons/{id}/` always have an associated `CourseNode` (`Lesson.node`) because lessons are created through Task 5.2.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/API.md](../docs/API.md)
[docs/API_ROUTE_MAPPING.md](../docs/API_ROUTE_MAPPING.md)
[docs/DATA_MODEL.md](../docs/DATA_MODEL.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
[DEV_WORKFLOW.md](../DEV_WORKFLOW.md)
[CLAUDE.md](../CLAUDE.md)
