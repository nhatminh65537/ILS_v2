---
goal: Slice 5 Task 5.1 Learn Course and Category CRUD API
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend API Team
status: 'Completed'
tags: [feature, learn, api, slice5, backend]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines deterministic implementation steps for Slice 5 Task 5.1 to deliver namespaced Learn domain APIs for course, category, and tag CRUD under /api/learn/* while preserving runtime compatibility with existing legacy routes.

## 1. Requirements & Constraints

- **REQ-001**: Implement namespaced Learn endpoints exactly as defined in IMPL plan Task 5.1: GET/POST /api/learn/courses/, GET/PUT/DELETE /api/learn/courses/{slug}/, GET/POST /api/learn/categories/, GET/PUT/DELETE /api/learn/categories/{id}/, GET/POST/PUT/DELETE /api/learn/tags/*.
- **REQ-002**: Use slug as the course detail identifier for namespaced routes; do not use numeric id in /api/learn/courses/{slug}/.
- **REQ-003**: Course list must support filter query params category, status, search and must include authenticated user_progress payload {completed, total}.
- **REQ-004**: Member visibility rule must be enforced: members can only see published courses regardless of requested status filter.
- **REQ-005**: Category create/update/delete operations must be restricted to Admin role grants.
- **REQ-006**: Tag create/update/delete operations must be permission-gated per Q-LEARN-07 (permission-based control, no public write).
- **REQ-007**: Slug flow must be manual-first with server uniqueness validation and deterministic conflict response (HTTP 409 with slug suggestions).
- **REQ-008**: Course delete behavior must follow Q-LEARN-04 hybrid strategy: archive default path plus restricted purge path.
- **SEC-001**: All new Learn endpoints must enforce IsAuthenticated and HasJWTPermission in DRF permission_classes.
- **SEC-002**: Do not expose secret config values or external service tokens in any course/category/tag serializer response.
- **API-001**: Keep existing legacy-flat runtime routes (/api/courses/*) operational during Task 5.1 to prevent regressions.
- **CON-001**: Implement on actual code paths that exist in repository: backend/api/views/courses.py and backend/api/serializers/course.py (do not target nonexistent backend/api/views/course.py).
- **CON-002**: Follow route migration rules in docs/API_ROUTE_MAPPING.md: new work must use namespaced target routes.
- **CON-003**: Slice 5 blockers Q-LEARN-01..Q-LEARN-10 are resolved and may be implemented; Q-CONFIG-01 remains open but does not block Task 5.1.
- **GUD-001**: When endpoint contracts change, synchronize docs/API.md, docs/STATUS.md, and docs/IMPL_PLAN.md in the same implementation session.
- **PAT-001**: Follow service-layer pattern: view logic delegates filtering/progress/slug/delete behavior to backend/api/services/course_service.py methods.
- **PAT-002**: Follow auto-derived permission key architecture (HasJWTPermission derive_permission_key) and role grant metadata with add_role_granted.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Activate namespaced Learn route surface for Task 5.1 without breaking existing runtime endpoints.
- VAL-001: URL resolver contains all required /api/learn/courses|categories|tags routes and existing /api/courses/* routes still resolve.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In backend/api/views/courses.py, add LearnCourseViewSet with permission_classes = [IsAuthenticated, HasJWTPermission], lookup_field = slug, lookup_url_kwarg = slug, and methods list/create/retrieve/update/destroy mapped to Task 5.1 contract. |  |  |
| TASK-002 | In backend/api/views/courses.py, add LearnCourseCategoryViewSet and LearnCourseTagViewSet (ModelViewSet or GenericViewSet+mixins) with explicit method-level role grants: category write Admin-only; tag write permission-gated and non-public. |  |  |
| TASK-003 | In backend/api/urls.py, register explicit re_path entries for /api/learn/courses/, /api/learn/courses/{slug}/, /api/learn/categories/, /api/learn/categories/{id}/, /api/learn/tags/, /api/learn/tags/{id}/ and keep existing router.register("courses", CourseViewSet, ...) unchanged for legacy compatibility. |  |  |
| TASK-004 | In backend/api/views/__init__.py, export any new Learn viewsets added in TASK-001 and TASK-002 so imports in backend/api/urls.py are stable. |  |  |

### Implementation Phase 2

- GOAL-002: Implement deterministic request and response contracts for course/category/tag APIs, including slug conflict and user progress payload.
- VAL-002: API responses match serializer schema and slug conflict returns HTTP 409 with suggestions.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | In backend/api/serializers/course.py, introduce LearnCourseListSerializer and LearnCourseDetailSerializer that include category object and tags list; list serializer includes user_progress object with keys completed and total. |  |  |
| TASK-006 | In backend/api/serializers/course.py, introduce LearnCourseWriteSerializer with writable fields title, slug, description, status, category_id, estimated_time, learning_point, tag_ids and validation for slug format and uniqueness pre-check. |  |  |
| TASK-007 | In backend/api/serializers/course.py, ensure CourseCategorySerializer and CourseTagSerializer expose deterministic fields id, name, description and validate unique name conflicts with stable error messages. |  |  |
| TASK-008 | In backend/api/services/course_service.py, add filter_visible_learn_courses(queryset, user, query_params) enforcing member published-only behavior even when status=draft is requested. |  |  |
| TASK-009 | In backend/api/services/course_service.py, add build_course_progress_map(user, courses) returning per-course completed and total lesson counts used by LearnCourseListSerializer context. |  |  |
| TASK-010 | In backend/api/services/course_service.py, add build_slug_suggestions(base_slug, limit=5) and make create/update flow return HTTP 409 payload {detail, slug, suggestions} on conflict. Depends on TASK-006. |  |  |

### Implementation Phase 3

- GOAL-003: Enforce decision compliance for delete strategy and permission behavior.
- VAL-003: Delete path archives by default, purge is restricted, and unauthorized write attempts return 403.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | In backend/api/services/course_service.py, add archive_or_purge_course(course, actor, mode) where mode=archive sets status=archived and mode=purge hard-deletes only when actor has Admin role grant. |  |  |
| TASK-012 | In backend/api/views/courses.py, wire LearnCourseViewSet.destroy to call archive_or_purge_course with mode read from query param mode (default archive). Return 204 for archive and purge outcomes. Depends on TASK-011. |  |  |
| TASK-013 | In backend/api/views/courses.py, enforce create/update/destroy role grants for LearnCourseViewSet to Admin and Editor; enforce category writes Admin-only; enforce tag writes through permission-gated handlers with HasJWTPermission active. |  |  |
| TASK-014 | In backend/api/views/courses.py, use queryset optimization select_related(category) and prefetch_related(tag_mappings__tag) in list/retrieve flows to avoid N+1 query patterns. |  |  |

### Implementation Phase 4

- GOAL-004: Add automated regression tests that verify contract behavior and route migration safety.
- VAL-004: New Learn API test module passes and existing quiz API tests continue passing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Create backend/api/tests/test_learn_course_api.py with integration tests for member list visibility, status filter hardening, editor create, slug conflict 409 suggestion payload, and user_progress object presence. |  |  |
| TASK-016 | In backend/api/tests/test_learn_course_api.py, add tests for category permissions: Admin can create/update/delete category; Editor and Member receive 403 on category write endpoints. |  |  |
| TASK-017 | In backend/api/tests/test_learn_course_api.py, add tests for tag routes: list works for authenticated members, write endpoints enforce permission-gated behavior and deny unauthorized actors. |  |  |
| TASK-018 | In backend/api/tests/test_learn_course_api.py, add route-compatibility checks: /api/learn/courses/{slug}/ works and legacy /api/courses/ remains operational until deprecation plan is executed. |  |  |
| TASK-019 | Execute pytest backend/api/tests/test_learn_course_api.py -q and pytest backend/api/tests/test_quiz_api.py -q; treat any failing assertion as blocker for Task 5.1 completion. Depends on TASK-015 to TASK-018. |  |  |

### Implementation Phase 5

- GOAL-005: Synchronize canonical documentation immediately after implementation.
- VAL-005: API, status, and implementation plan docs are consistent with implemented routes in same session.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Update docs/API.md Section 3.3 and Section 4.2 to mark /api/learn/courses/*, /api/learn/categories/*, /api/learn/tags/* runtime status and notes, including legacy-flat compatibility note. |  |  |
| TASK-021 | Update docs/STATUS.md Slice 5 row for Task 5.1 from pending to completed only after TASK-019 passes. |  |  |
| TASK-022 | If implementation behavior differs from current text in docs/IMPL_PLAN.md (for example file path or delete-mode wording), update docs/IMPL_PLAN.md in same session and record rationale in docs/reports session report. |  |  |

## 3. Alternatives

- **ALT-001**: Keep only legacy-flat routes (/api/courses/*) and postpone namespaced routes. Rejected because route mapping and Slice 5 contract require /api/learn/* for new work.
- **ALT-002**: Implement Task 5.1 in a new backend app (learn/) instead of current api app. Rejected because architecture decision R-ARCH-13 keeps all viewsets under api/views/.
- **ALT-003**: Two-step slug conflict handling with a separate slug suggestion endpoint only. Rejected because Q-LEARN-05 requires server-assisted conflict handling in the write flow with 409 suggestions.
- **ALT-004**: Hard-delete only for course destroy. Rejected because Q-LEARN-04 resolved hybrid archive plus restricted purge strategy.

## 4. Dependencies

- **DEP-001**: Django REST Framework ViewSet and router/re_path wiring in backend/api/urls.py.
- **DEP-002**: Permission framework in backend/auth_app/permissions.py (HasJWTPermission, add_role_granted, derive_permission_key).
- **DEP-003**: Domain models in backend/api/models.py: Course, CourseCategory, CourseTag, CourseTagMap, CourseNode, UserCourseProgress.
- **DEP-004**: Existing service module backend/api/services/course_service.py for business logic extraction.
- **DEP-005**: Test fixtures in backend/conftest.py providing admin_client, editor_client, member_client users.
- **DEP-006**: Contract references in docs/IMPL_PLAN.md, docs/DECISIONS.md (Q-LEARN-04/05/07), docs/API_ROUTE_MAPPING.md.

## 5. Files

- **FILE-001**: backend/api/views/courses.py - add namespaced Learn viewsets and decision-compliant handlers.
- **FILE-002**: backend/api/urls.py - add /api/learn/courses|categories|tags route mappings.
- **FILE-003**: backend/api/views/__init__.py - export new Learn viewsets for URL wiring.
- **FILE-004**: backend/api/serializers/course.py - add write/list/detail serializers and validation.
- **FILE-005**: backend/api/services/course_service.py - add filtering, progress map, slug suggestion, archive/purge methods.
- **FILE-006**: backend/api/tests/test_learn_course_api.py - new integration test suite for Task 5.1.
- **FILE-007**: docs/API.md - update canonical endpoint inventory and maturity tags.
- **FILE-008**: docs/STATUS.md - mark Task 5.1 progress after tests pass.
- **FILE-009**: docs/IMPL_PLAN.md - sync wording if runtime implementation differs from current task text.

## 6. Testing

- **TEST-001**: Route contract tests for all namespaced endpoints using DRF test client and expected method matrix.
- **TEST-002**: Visibility tests proving member cannot access draft courses even with status=draft query.
- **TEST-003**: Role/permission tests for category and tag write endpoints returning 403 for unauthorized actors.
- **TEST-004**: Slug conflict tests validating HTTP 409 and deterministic suggestions payload schema.
- **TEST-005**: Delete behavior tests validating archive default path and admin-only purge path.
- **TEST-006**: Regression tests ensuring legacy /api/courses/* routes continue to respond while namespaced routes are introduced.
- **TEST-007**: Command validation: pytest backend/api/tests/test_learn_course_api.py -q returns success.
- **TEST-008**: Command validation: pytest backend/api/tests/test_quiz_api.py -q returns success after Learn route changes.

## 7. Risks & Assumptions

- **RISK-001**: Current doc-code inconsistency D-DOC-01 (course.structure_version missing in models.py) may require additional migration work in later Slice 5 tasks.
- **RISK-002**: Current doc-code inconsistency D-DOC-02 (lesson.status missing in models.py) can affect downstream progress and visibility behavior in Task 5.3+.
- **RISK-003**: If permission catalog is not synchronized in a test environment, HasJWTPermission bitmap checks may deny valid requests until permission discovery runs.
- **ASSUMPTION-001**: auth.authorization_enabled remains true in production-like validation runs.
- **ASSUMPTION-002**: Legacy-flat routes remain temporarily supported and are not removed during Task 5.1.
- **ASSUMPTION-003**: Hybrid delete is implemented as archive default plus restricted purge flow without introducing new model fields in this task.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/API.md](../docs/API.md)
[docs/API_ROUTE_MAPPING.md](../docs/API_ROUTE_MAPPING.md)
[docs/DATA_MODEL.md](../docs/DATA_MODEL.md)
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
