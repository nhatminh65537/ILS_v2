---
goal: Slice 5 Task 5.4 Learn Progress Tracking API and Signal Chain
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend API Team
status: 'Planned'
tags: [feature, learn, progress, api, signals, slice5, backend]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 5 Task 5.4 to deliver canonical namespaced Learn progress endpoints, signal-driven aggregate updates, and versioned lazy recompute aligned with `docs/IMPL_PLAN.md`, `docs/DECISIONS.md` (Q-LEARN-03/08/09), and `docs/DATA_MODEL.md`.

## 1. Requirements & Constraints

- **REQ-001**: Implement Task 5.4 endpoints exactly as defined in `docs/IMPL_PLAN.md`:
  - `POST /api/learn/lessons/{id}/progress/start/` (explicit start, idempotent)
  - `POST /api/learn/lessons/{id}/progress/complete/` (hybrid completion path, idempotent)
  - `GET /api/learn/courses/{slug}/progress/` (returns `{lesson_count, completed, percent}`)
- **REQ-002**: Enforce explicit lesson-start behavior (Q-LEARN-09 Option B): no implicit start on lesson GET.
- **REQ-003**: Enforce hybrid completion model (Q-LEARN-08 Option D): backend accepts explicit complete call and remains idempotent across retries.
- **REQ-004**: Implement versioned lazy recompute strategy for course progress (Q-LEARN-03 Option D): recompute only when `user_course_progress.last_computed_version != course.structure_version`.
- **REQ-005**: Progress completion chain must follow IMPL contract: setting `UserLessonProgress.completed_at` triggers update of `UserCourseProgress`, then updates `UserProfile` aggregate counters/points.
- **REQ-006**: Course completion reward logic must award `course.learning_point` once per first completion transition; repeated complete calls must not double-award.
- **REQ-007**: For Learn visibility, member users can track progress only for lessons in published courses; editor/admin can track for all course statuses.
- **REQ-008**: Keep legacy-flat routes active for compatibility (`/api/lessons/{id}/complete/`, `/api/courses/{id}/progress/`), but new implementation must target namespaced routes from `docs/API_ROUTE_MAPPING.md`.
- **REQ-009**: Align ORM with `docs/DATA_MODEL.md` for `user_course_progress` cache fields required by versioned recompute:
  - `completed_lessons_cache`
  - `total_lessons_cache`
  - `progress_percent_cache`
  - `last_computed_version`
- **SEC-001**: All new namespaced progress endpoints must enforce `permission_classes = [IsAuthenticated, HasJWTPermission]`.
- **SEC-002**: Route access must use role grants `@add_role_granted('Admin','Editor','Member')`; writes by unauthenticated users are forbidden.
- **SEC-003**: Progress endpoints must not leak inaccessible lesson/course existence to members; return 404 for non-visible resources.
- **API-001**: New documentation and implementation work must use namespaced Learn routes (`/api/learn/*`) only.
- **CON-001**: Architecture constraint from `docs/ARCHITECTURE.md`: no DB triggers; denormalized updates must occur in service logic and Django signals.
- **CON-002**: Existing code currently contains legacy model-side completion logic in `Lesson.mark_completed`; Task 5.4 must unify completion behavior through one deterministic pipeline to avoid double counting.
- **CON-003**: `Q-CONFIG-01` remains OPEN but does not block Task 5.4.
- **GUD-001**: Follow process in `CLAUDE.md` and `DEV_WORKFLOW.md`: implement, run focused tests, update docs (`API`, `STATUS`, `IMPL_PLAN` if contract changed), write session report.
- **PAT-001**: Use service-layer orchestration for progress state changes; keep views thin.
- **PAT-002**: Use signal pattern already established in `backend/api/signals.py` (quiz progress) with idempotent transition checks.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align progress storage schema with authoritative data model for versioned lazy recompute.
- VAL-001: `UserCourseProgress` has cache/version columns in ORM and migration applies cleanly.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In `backend/api/models.py`, update `class UserCourseProgress` to add fields: `completed_lessons_cache = models.IntegerField(default=0)`, `total_lessons_cache = models.IntegerField(default=0)`, `progress_percent_cache = models.DecimalField(max_digits=5, decimal_places=2, default=0)`, `last_computed_version = models.IntegerField(default=0)`. |  |  |
| TASK-002 | In `backend/api/models.py`, keep existing `started_at` and `completed_at`; do not remove legacy fields. |  |  |
| TASK-003 | Create migration `backend/api/migrations/*_user_course_progress_cache_fields.py` adding the four columns with non-null defaults and preserving existing rows. |  |  |
| TASK-004 | Verify migration using `python backend/manage.py makemigrations api` and `python backend/manage.py migrate` in local `.venv` without unrelated schema drift. |  |  |

### Implementation Phase 2

- GOAL-002: Implement deterministic progress domain service with explicit start/complete operations and lazy recompute helpers.
- VAL-002: Service methods support idempotent start/complete and expose a single recompute path used by API and signals.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `backend/api/services/learn_progress_service.py` with `class LearnProgressService`. |  |  |
| TASK-006 | Implement `LearnProgressService.start_lesson(user, lesson, actor)` to upsert `UserLessonProgress` with `started_at` if absent and preserve original timestamp on retries. |  |  |
| TASK-007 | Implement `LearnProgressService.complete_lesson(user, lesson, actor)` to upsert `UserLessonProgress`, set `completed_at` only if null, and ensure `started_at` is populated. Return transition metadata (`was_completed`, `is_completed`). |  |  |
| TASK-008 | Implement `LearnProgressService.get_or_create_course_progress(user, course)` for deterministic upsert of `UserCourseProgress` and initial `started_at`. |  |  |
| TASK-009 | Implement `LearnProgressService.recompute_course_progress_if_stale(user, course)` comparing `last_computed_version` with `course.structure_version`; recompute caches only when stale. |  |  |
| TASK-010 | Implement `LearnProgressService.recompute_course_progress(user, course)` to calculate: lesson denominator from `CourseNode(is_item=True, lesson_id IS NOT NULL)`, completed count from `UserLessonProgress(completed_at IS NOT NULL)` joined by course, and percent as rounded decimal. |  |  |
| TASK-011 | In `LearnProgressService.recompute_course_progress`, set `UserCourseProgress.completed_at` when `completed_count >= total_count` and `total_count > 0`; clear completion when no longer complete after structure change. |  |  |
| TASK-012 | Implement `LearnProgressService.sync_user_profile_on_course_completion(user, course, previous_completed_at, new_completed_at)` to increment `UserProfile.course_completed` and `UserProfile.total_learning_point` only on first incomplete->complete transition (use `F()` update). |  |  |
| TASK-013 | Update `backend/api/services/__init__.py` to export `LearnProgressService` in imports and `__all__`. |  |  |

### Implementation Phase 3

- GOAL-003: Wire signal chain from lesson completion to course aggregate/profile updates.
- VAL-003: Saving `UserLessonProgress.completed_at` triggers deterministic recompute and profile sync without double-count.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | In `backend/api/signals.py`, import `UserLessonProgress`, `CourseNode`, and `LearnProgressService`. |  |  |
| TASK-015 | Add `@receiver(post_save, sender=UserLessonProgress)` handler `handle_lesson_progress_saved(sender, instance, created, **kwargs)`. |  |  |
| TASK-016 | In signal handler, short-circuit when `instance.completed_at is None` (start-only updates do not recompute completion chain). |  |  |
| TASK-017 | In signal handler, resolve owning course via `instance.lesson.node.course`; if missing node linkage, safely return with warning log (no exception). |  |  |
| TASK-018 | In signal handler, call `LearnProgressService.recompute_course_progress(user=instance.user, course=course)` and let service handle profile transition updates. |  |  |
| TASK-019 | Keep quiz progress signal logic intact; do not regress `handle_quiz_attempt_finished`. |  |  |

### Implementation Phase 4

- GOAL-004: Add namespaced progress endpoints and serializer responses for Task 5.4.
- VAL-004: New `/api/learn/*/progress/*` routes resolve and return contract-compliant payloads.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | In `backend/api/serializers/course.py`, add `LearnCourseProgressSerializer(serializers.Serializer)` with fields: `lesson_count`, `completed`, `percent` (plus optional `started_at`, `completed_at` for diagnostics if desired by API doc update). |  |  |
| TASK-021 | In `backend/api/views/courses.py`, import `LearnProgressService` and `LearnCourseProgressSerializer`. |  |  |
| TASK-022 | In `LearnLessonViewSet`, implement `start_progress(self, request, pk=None)` mapped to POST `/api/learn/lessons/{id}/progress/start/`; resolve lesson via existing `_get_lesson_or_404`, call `LearnProgressService.start_lesson`, return 200 idempotent payload. |  |  |
| TASK-023 | In `LearnLessonViewSet`, implement `complete_progress(self, request, pk=None)` mapped to POST `/api/learn/lessons/{id}/progress/complete/`; resolve lesson, call `LearnProgressService.complete_lesson`, return 200 idempotent payload. |  |  |
| TASK-024 | In `LearnCourseViewSet`, implement `progress(self, request, slug=None)` mapped to GET `/api/learn/courses/{slug}/progress/`; resolve visible course by slug, call `LearnProgressService.recompute_course_progress_if_stale`, serialize response as `{lesson_count, completed, percent}`. |  |  |
| TASK-025 | In `backend/api/urls.py`, add explicit `re_path` routes: `^learn/lessons/(?P<pk>\d+)/progress/start/$`, `^learn/lessons/(?P<pk>\d+)/progress/complete/$`, and `^learn/courses/(?P<slug>[a-z0-9-]+)/progress/$`. |  |  |
| TASK-026 | Keep legacy routes unchanged in router (`/api/lessons/{id}/complete/`, `/api/courses/{id}/progress/`) to avoid breaking existing clients during migration. |  |  |

### Implementation Phase 5

- GOAL-005: Unify legacy completion behavior to the same progress pipeline and remove model-side point side effects.
- VAL-005: Legacy and namespaced completion endpoints produce consistent state transitions without duplicate point updates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | In `backend/api/models.py`, refactor `Lesson.mark_completed(self, user)` to delegate to `LearnProgressService.complete_lesson(...)` and remove direct mutation of `UserProfile.total_learning_point` from model method. |  |  |
| TASK-028 | In `backend/api/views/courses.py`, update legacy `LessonViewSet.complete` to rely on unified completion behavior (either through `lesson.mark_completed` refactor or direct service call) and remain idempotent. |  |  |
| TASK-029 | In `backend/api/views/courses.py`, update legacy `CourseViewSet.progress` to source data from `LearnProgressService.recompute_course_progress_if_stale` while preserving response compatibility expectations for legacy consumers. |  |  |

### Implementation Phase 6

- GOAL-006: Add automated validation for endpoint contract, idempotency, signal chain, and recompute behavior.
- VAL-006: Focused progress suite and existing Learn suites pass in `.venv`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-030 | Create `backend/api/tests/test_learn_progress_api.py` with `pytestmark = pytest.mark.integration` and role helper pattern consistent with existing Slice 5 tests. |  |  |
| TASK-031 | Add test: explicit start endpoint creates/updates `UserLessonProgress.started_at` idempotently (`POST` twice does not reset started_at). |  |  |
| TASK-032 | Add test: complete endpoint sets `UserLessonProgress.completed_at` and is idempotent across repeated calls. |  |  |
| TASK-033 | Add test: completing final lesson sets `UserCourseProgress.completed_at`, increments `UserProfile.course_completed` and `total_learning_point` exactly once. |  |  |
| TASK-034 | Add test: course progress endpoint returns contract fields `lesson_count`, `completed`, `percent` with expected values. |  |  |
| TASK-035 | Add test: structure version change (`course.structure_version` increment via node mutation) causes stale cache recompute on next `GET /api/learn/courses/{slug}/progress/`. |  |  |
| TASK-036 | Add test: member receives 404 for draft-course lesson progress start/complete; editor receives success for same lesson. |  |  |
| TASK-037 | Add test: legacy `/api/lessons/{id}/complete/` uses unified pipeline and does not double-award profile points when combined with namespaced complete endpoint calls. |  |  |
| TASK-038 | Execute `pytest backend/api/tests/test_learn_progress_api.py -q`, then regression suites: `pytest backend/api/tests/test_learn_course_api.py -q`, `pytest backend/api/tests/test_learn_course_node_api.py -q`, `pytest backend/api/tests/test_learn_lesson_api.py -q`. |  |  |

### Implementation Phase 7

- GOAL-007: Synchronize canonical docs and session artifacts according to project process.
- VAL-007: API/status/plan docs and session report are updated in same session after tests pass.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-039 | Update `docs/API.md` to mark Task 5.4 namespaced progress endpoints as active and clarify legacy compatibility notes for `/api/lessons/{id}/complete/` and `/api/courses/{id}/progress/`. |  |  |
| TASK-040 | Update `docs/STATUS.md` Slice 5 row to mark Task 5.4 complete only after TASK-038 passes. |  |  |
| TASK-041 | If implementation contracts differ from current text in `docs/IMPL_PLAN.md` Task 5.4, normalize `docs/IMPL_PLAN.md` in same session. |  |  |
| TASK-042 | Create session report `docs/reports/YYYY-MM-DD_slice5-task5-4-learn-progress-api.md` including non-trivial algorithms (idempotent completion, stale-version recompute, signal transition update). |  |  |
| TASK-043 | Update `openmemory.md` with new progress pipeline pattern and store at least one memory entry for repository context. |  |  |

## 3. Alternatives

- **ALT-001**: Recompute all user-course progress rows eagerly on every course structure mutation. Rejected because Q-LEARN-03 resolved to versioned lazy recompute (Option D).
- **ALT-002**: Implement completion updates directly in endpoint methods without signals. Rejected because IMPL contract requires signal chain and architecture prefers app-level denormalized sync via signals/services.
- **ALT-003**: Keep implicit lesson start on lesson GET. Rejected because Q-LEARN-09 resolved explicit start action.
- **ALT-004**: Preserve model-side lesson point awarding in `Lesson.mark_completed`. Rejected because progress reward contract is course-level completion reward and model-side increments risk double counting.

## 4. Dependencies

- **DEP-001**: Models in `backend/api/models.py`: `Course`, `CourseNode`, `Lesson`, `UserLessonProgress`, `UserCourseProgress`, `UserProfile`.
- **DEP-002**: Existing Learn service/view modules: `backend/api/services/course_service.py`, `backend/api/services/lesson_service.py`, `backend/api/views/courses.py`.
- **DEP-003**: Signal registration via `backend/api/apps.py` (`ApiConfig.ready` imports `api.signals`).
- **DEP-004**: Permission framework: `auth_app.permissions.HasJWTPermission` and `add_role_granted`.
- **DEP-005**: Decision constraints from `docs/DECISIONS.md`: Q-LEARN-03, Q-LEARN-08, Q-LEARN-09.
- **DEP-006**: Route policy from `docs/API_ROUTE_MAPPING.md` and canonical inventory in `docs/API.md`.

## 5. Files

- **FILE-001**: `backend/api/models.py` - extend `UserCourseProgress`; refactor `Lesson.mark_completed` to unified pipeline.
- **FILE-002**: `backend/api/migrations/*_user_course_progress_cache_fields.py` - schema migration for cache/version fields.
- **FILE-003**: `backend/api/services/learn_progress_service.py` - new progress orchestration service.
- **FILE-004**: `backend/api/services/__init__.py` - export `LearnProgressService`.
- **FILE-005**: `backend/api/signals.py` - add `UserLessonProgress` completion signal handler.
- **FILE-006**: `backend/api/serializers/course.py` - add progress response serializer(s).
- **FILE-007**: `backend/api/views/courses.py` - add namespaced progress handlers and unify legacy complete/progress behavior.
- **FILE-008**: `backend/api/urls.py` - wire `/api/learn/lessons/{id}/progress/*` and `/api/learn/courses/{slug}/progress/`.
- **FILE-009**: `backend/api/tests/test_learn_progress_api.py` - new integration coverage for Task 5.4.
- **FILE-010**: `docs/API.md` - update endpoint inventory/maturity for Task 5.4.
- **FILE-011**: `docs/STATUS.md` - update Slice 5 task state after validation.
- **FILE-012**: `docs/IMPL_PLAN.md` - normalize task text only if implementation contract deviates.
- **FILE-013**: `docs/reports/YYYY-MM-DD_slice5-task5-4-learn-progress-api.md` - mandatory session report.
- **FILE-014**: `openmemory.md` - repository index update for new progress flow pattern.

## 6. Testing

- **TEST-001**: Endpoint contract test for POST `/api/learn/lessons/{id}/progress/start/` (200 + idempotent started_at).
- **TEST-002**: Endpoint contract test for POST `/api/learn/lessons/{id}/progress/complete/` (200 + idempotent completed_at).
- **TEST-003**: Endpoint contract test for GET `/api/learn/courses/{slug}/progress/` response schema includes `lesson_count`, `completed`, `percent`.
- **TEST-004**: Signal chain test: saving completion updates `UserCourseProgress` and profile counters only on first completion transition.
- **TEST-005**: Lazy recompute test: stale `last_computed_version` is refreshed after course structure version changes.
- **TEST-006**: Visibility test: member cannot progress-track draft course lessons (`404`), editor/admin can.
- **TEST-007**: Legacy compatibility test: `/api/lessons/{id}/complete/` still works and shares the same idempotent reward logic.
- **TEST-008**: Focused command: `pytest backend/api/tests/test_learn_progress_api.py -q` passes.
- **TEST-009**: Regression commands: `pytest backend/api/tests/test_learn_course_api.py -q`, `pytest backend/api/tests/test_learn_course_node_api.py -q`, `pytest backend/api/tests/test_learn_lesson_api.py -q` pass.

## 7. Risks & Assumptions

- **RISK-001**: `Lesson.status` field is still missing in runtime ORM (tracked as doc-code inconsistency), so progress denominator currently cannot exclude draft lessons inside published courses at lesson-level granularity.
- **RISK-002**: Concurrent completion requests may race on first completion transition; mitigation requires transaction-safe `select_for_update` or transition checks with atomic `F()` updates.
- **RISK-003**: Legacy endpoint response compatibility may constrain cleanup/refactor depth in Task 5.4.
- **ASSUMPTION-001**: Existing role fixtures (`Admin`, `Editor`, `Member`) are available in tests or created by helper setup.
- **ASSUMPTION-002**: `auth.authorization_enabled` may be toggled during dev, but authenticated access is always required for these endpoints.
- **ASSUMPTION-003**: Course-level reward policy is authoritative (`course.learning_point` on course completion), and lesson-level direct point reward is treated as legacy behavior to be normalized.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/DATA_MODEL.md](../docs/DATA_MODEL.md)
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
[docs/API.md](../docs/API.md)
[docs/API_ROUTE_MAPPING.md](../docs/API_ROUTE_MAPPING.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
[DEV_WORKFLOW.md](../DEV_WORKFLOW.md)
[CLAUDE.md](../CLAUDE.md)
