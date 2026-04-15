# Session Report: Slice 5 Task 5.1 Learn CRUD API

**Date:** 2026-04-15
**Slices / Areas:** Slice 5 - Learn (Task 5.1 Course + Category CRUD API)

## Summary

Implemented the full Task 5.1 backend slice for Learn namespaced APIs by activating canonical endpoints under /api/learn/courses, /api/learn/categories, and /api/learn/tags; adding slug-based course detail routing, member visibility hardening, deterministic slug conflict handling with 409 suggestions, user progress payloads in course responses, and hybrid delete behavior (archive default with admin-only purge). Added integration regression tests and synchronized API/status/planning documentation in the same session.

## Completed Items

- [x] Added namespaced Learn Course CRUD endpoint set under /api/learn/courses/*.
- [x] Added namespaced Learn Category CRUD endpoint set under /api/learn/categories/*.
- [x] Added namespaced Learn Tag CRUD endpoint set under /api/learn/tags/*.
- [x] Kept legacy /api/courses/* routes active for migration compatibility.
- [x] Added Learn-specific serializers for list/detail/write contracts.
- [x] Added server-side slug suggestion and conflict response flow (409).
- [x] Added per-course user progress payload in list/detail responses.
- [x] Added archive-or-purge delete strategy in service layer.
- [x] Added integration test suite for Slice 5 Task 5.1.
- [x] Updated docs/API.md, docs/STATUS.md, docs/IMPL_PLAN.md.

## Key Implementations

### Namespaced Learn Route Activation

1. Added explicit URL mappings in backend/api/urls.py for /api/learn/courses, /api/learn/categories, and /api/learn/tags.
2. Bound methods to dedicated viewsets for exact method matrix (GET/POST list routes, GET/PUT/DELETE detail routes).
3. Preserved existing router-based legacy routes (/api/courses/*) to avoid breaking consumers during migration.

### Course Visibility and Filtering Logic

1. Added role-aware filter function in CourseService to classify editor/admin versus member.
2. Enforced member hard rule: always status=published, ignoring requested status filter from client.
3. Applied category/search filters and stable ordering for deterministic paginated responses.

### Slug Conflict and Suggestion Flow

1. Normalized incoming slug values to lowercase trimmed form before create/update checks.
2. Performed pre-save conflict check and returned HTTP 409 with deterministic suggestion list when occupied.
3. Added IntegrityError fallback path to preserve 409 behavior under race conditions.

### User Progress Projection in Course Response

1. Aggregated total lesson items per course from course_node with is_item=true and lesson linked.
2. Aggregated completed lessons per user/course via UserLessonProgress joined through lesson->node->course.
3. Merged aggregates into per-course user_progress payload {completed, total} in Learn list/detail serializers.

### Hybrid Course Delete Strategy

1. Implemented service method archive_or_purge_course(mode) with strict mode validation.
2. Default delete path archives by setting status=archived.
3. Purge path physically deletes only when actor is Admin (or superuser), otherwise returns permission error.

## Files Changed

| File | Change Summary |
|------|---------------|
| backend/api/views/courses.py | Added LearnCourseViewSet, LearnCourseCategoryViewSet, LearnCourseTagViewSet; slug conflict flow; archive/purge delete handling; progress-aware list/detail responses. |
| backend/api/services/course_service.py | Added role-aware visibility filter, progress aggregation map, slug suggestion builder, tag upsert helper, archive/purge strategy. |
| backend/api/serializers/course.py | Added LearnCourseListSerializer, LearnCourseDetailSerializer, LearnCourseWriteSerializer; category/tag unique validators. |
| backend/api/serializers/__init__.py | Exported new Learn serializers. |
| backend/api/views/__init__.py | Exported new Learn viewsets. |
| backend/api/urls.py | Wired /api/learn/courses/*, /api/learn/categories/*, /api/learn/tags/* routes. |
| backend/api/tests/test_learn_course_api.py | Added integration tests for visibility, slug conflict, category/tag permissions, compatibility routes, and archive/purge behavior. |
| docs/API.md | Marked Slice 5 Task 5.1 namespaced Learn endpoints as active and documented contracts/compatibility notes. |
| docs/STATUS.md | Marked Slice 5 Task 5.1 as completed with implementation summary. |
| docs/IMPL_PLAN.md | Synced Task 5 file paths to backend/api/views/courses.py. |

## Notes / Caveats

- Legacy flat routes /api/courses/* are intentionally still active for transition; deprecation/removal should be scheduled in a separate migration task.
- Tag write operations are permission-gated with current role grants Admin/Editor; future tightening can move to finer permission key governance if required.
- Existing doc-code inconsistencies unrelated to Task 5.1 (e.g., course.structure_version in models) remain tracked in docs/BUGS.md.
