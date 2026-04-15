# Session Report: Slice 5 Task 5.4 Learn Progress API

**Date:** 2026-04-15
**Slices / Areas:** Slice 5 - Learn (Task 5.4 User progress tracking)

## Summary

Implemented Task 5.4 end-to-end for Learn progress tracking: canonical namespaced progress endpoints were added, lesson completion now flows through a unified idempotent service pipeline, course progress uses versioned lazy recompute with cache fields, and a new Django signal handler updates course/profile aggregates on lesson completion. The implementation also preserves legacy compatibility routes while removing double-award risk by unifying completion behavior.

## Completed Items

- [ implemented ] Added namespaced Learn progress endpoints for lesson start/complete and course progress.
- [ implemented ] Added `UserCourseProgress` cache/version fields and migration `0007_user_course_progress_cache_fields.py`.
- [ implemented ] Added `LearnProgressService` for idempotent start/complete + versioned recompute.
- [ implemented ] Added `UserLessonProgress` post-save signal handler to recompute course aggregates and sync profile counters.
- [ implemented ] Unified legacy lesson complete flow (`/api/lessons/{id}/complete/`) to use the same pipeline.
- [ implemented ] Added integration tests for Task 5.4 and ran Slice 5 regression suites.
- [ implemented ] Synchronized API and status documentation for Task 5.4 completion.

## Key Implementations

### Learn Progress Service Pipeline

1. `start_lesson` performs idempotent upsert on `user_lesson_progress.started_at`, preserving the first timestamp across retries.
2. `complete_lesson` performs idempotent completion transition (sets `completed_at` only once) and guarantees `started_at` existence.
3. Course-scoped progress row is created on first lesson interaction to stabilize future reads.
4. `recompute_course_progress_if_stale` compares `last_computed_version` with `course.structure_version` and recomputes only when stale.
5. `recompute_course_progress` updates denormalized caches (`completed_lessons_cache`, `total_lessons_cache`, `progress_percent_cache`) and marks course complete when threshold is reached.

### Signal Chain: Lesson -> Course -> Profile

1. `post_save(UserLessonProgress)` handler ignores non-complete saves (`completed_at is None`).
2. For complete saves, handler resolves owning course via `lesson.node.course` and calls recompute service.
3. Recompute captures completion transition (`previous_completed_at` -> `new_completed_at`).
4. On first completion transition only, profile counters are incremented using atomic `F()` updates (`course_completed`, `total_learning_point`).

### Legacy Compatibility Unification

1. Existing `Lesson.mark_completed` no longer mutates profile points directly.
2. Legacy completion endpoint now executes through the same `LearnProgressService.complete_lesson` path.
3. This keeps old route behavior while preventing duplicate reward side effects when mixed with namespaced endpoints.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/models.py` | Added cache/version fields to `UserCourseProgress`; refactored `Lesson.mark_completed` to use unified progress service. |
| `backend/api/migrations/0007_user_course_progress_cache_fields.py` | Added migration for new course-progress cache/version columns. |
| `backend/api/services/learn_progress_service.py` | Added progress orchestration service (idempotent start/complete, lazy recompute, profile sync). |
| `backend/api/services/__init__.py` | Exported `LearnProgressService`. |
| `backend/api/signals.py` | Added `UserLessonProgress` completion signal handler for course/profile aggregate updates. |
| `backend/api/serializers/course.py` | Added `LearnCourseProgressSerializer`. |
| `backend/api/serializers/__init__.py` | Exported `LearnCourseProgressSerializer`. |
| `backend/api/views/courses.py` | Added namespaced progress handlers and integrated `LearnProgressService`. |
| `backend/api/urls.py` | Added `/api/learn/lessons/{id}/progress/start/`, `/progress/complete/`, and `/api/learn/courses/{slug}/progress/`. |
| `backend/api/tests/test_learn_progress_api.py` | Added integration tests for progress endpoints, idempotency, recompute, visibility, and legacy compatibility. |
| `docs/API.md` | Updated active Learn endpoint inventory and notes for Task 5.4. |
| `docs/STATUS.md` | Marked Task 5.4 completed and added evidence entry. |

## Notes / Caveats

- `lesson.status` is still not present in runtime ORM (tracked separately in doc-code inconsistencies), so progress denominator currently counts all lesson nodes attached to the course.
- Course completion reward is currently first-transition only and does not attempt retroactive decrement on later structure expansions.
- Test execution used pytest suites:
  - `backend/api/tests/test_learn_progress_api.py`
  - `backend/api/tests/test_learn_course_api.py`
  - `backend/api/tests/test_learn_course_node_api.py`
  - `backend/api/tests/test_learn_lesson_api.py`
