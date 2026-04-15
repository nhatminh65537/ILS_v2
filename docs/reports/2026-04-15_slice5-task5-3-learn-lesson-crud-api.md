# Session Report: Slice 5 / Task 5.3 — Learn Lesson CRUD API

**Date:** 2026-04-15
**Slices / Areas:** Slice 5 — Learn (Task 5.3 Lesson CRUD + Miniquiz question mapping)

## Summary

Implemented the canonical namespaced Learn lesson endpoints under `/api/learn/lessons/*`, including lesson detail/update and mini-quiz question mapping management, with member visibility hardening (published-course only) and editor/admin write gates. Added integration tests and updated canonical API docs.

## Completed Items

- Implemented `/api/learn/lessons/{id}/` (GET/PUT)
- Implemented `/api/learn/lessons/{id}/questions/` (GET/POST) for mini-quiz lesson question mappings
- Implemented `/api/learn/lesson-questions/{id}/` (GET/PUT/DELETE) for mapping detail/position update/delete
- Enforced member visibility rules (lesson must belong to a published course)
- Added integration test coverage for visibility, write gates, and duplicate attach behavior
- Updated `docs/API.md` endpoint inventory

## Key Implementations

### Lesson visibility hardening (member)

1. Resolve lesson with `select_related('node__course')` to avoid N+1 lookups.
2. Treat lessons without a `CourseNode` as not-found for canonical learn endpoints.
3. For members, require `lesson.node.course.status == published`; otherwise raise not-found to avoid information leakage.

### Mini-quiz question mapping operations

1. Require `lesson.lesson_type == miniquiz` for mapping list/attach; otherwise return `400`.
2. Attach operation validates `question_id` exists, computes `position` (append by default), and enforces uniqueness on `(lesson, question)`.
3. Duplicate attach returns `409` with a deterministic error message.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/lesson_service.py` | Added `LessonService` for lesson visibility + mapping operations |
| `backend/api/services/__init__.py` | Exported `LessonService` |
| `backend/api/serializers/course.py` | Added learn lesson detail/update serializers + mapping serializers |
| `backend/api/serializers/__init__.py` | Re-exported new serializers |
| `backend/api/views/courses.py` | Added `LearnLessonViewSet` + `LearnLessonQuestionViewSet` |
| `backend/api/views/__init__.py` | Exported new viewsets |
| `backend/api/urls.py` | Wired `/api/learn/lessons/*` + `/api/learn/lesson-questions/*` routes |
| `backend/api/tests/test_learn_lesson_api.py` | Added integration tests for Task 5.3 endpoints |
| `docs/API.md` | Documented new canonical learn lesson endpoints |
| `docs/STATUS.md` | Marked Task 5.3 as completed and added report evidence |

## Notes / Caveats

- Tests were executed using the repository virtualenv interpreter (`.venv/Scripts/python.exe`) and the focused Slice 5 suites passed:
	- `backend/api/tests/test_learn_lesson_api.py`
	- `backend/api/tests/test_learn_course_api.py`
	- `backend/api/tests/test_learn_course_node_api.py`
- `/api/learn/lessons/` list endpoint is not implemented as part of Task 5.3; this task covers detail/update and mini-quiz mapping endpoints only.
