---
goal: Slice 5 Task 5.7 Frontend Course Editor (admin/editor surface)
version: 1
date_created: 2026-04-16
last_updated: 2026-04-16
owner: Frontend Team
status: 'Planned'
tags: [feature, learn, frontend, admin-surface, slice5, task5.7]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic, machine-executable implementation steps for Slice 5 Task 5.7 to deliver the admin/editor Learn authoring surface under /{locale}/admin/learn/*, including course list/create/editor pages, tree operations, and lesson content editor tabs (Markdown, Video, Mini-quiz), while keeping Outline sync logic deferred to Task 5.8.

## 1. Requirements & Constraints

- **REQ-001**: Replace all current skeleton pages at exact paths:
  - `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/page.tsx`
  - `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/new/page.tsx`
  - `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/[slug]/page.tsx`
  - `frontend/app/[locale]/(admin)/admin/(protected)/learn/lessons/[id]/page.tsx`
- **REQ-002**: Course list page must render table columns `title`, `slug`, `category`, `status`, `updated_at`, and `actions` with deterministic sorting by `updated_at desc` then `id desc`.
- **REQ-003**: Course list page must implement quick status transitions (`draft|published|archived`) using canonical update endpoint `PUT /api/learn/courses/{slug}/`.
- **REQ-004**: Course create page must submit fields `title`, `slug`, `description`, `category_id`, `tag_ids`, `learning_point`, `estimated_time`, `status`.
- **REQ-005**: Course editor page must provide tabbed UI with two tabs: `Metadata` and `Tree`.
- **REQ-006**: Metadata tab must support full edit/save flow for the same payload as create page except immutable slug.
- **REQ-007**: Tree tab must support folder/item CRUD via canonical node endpoints:
  - `GET /api/learn/courses/{slug}/nodes/`
  - `GET /api/learn/courses/{slug}/nodes/{id}/children/`
  - `POST /api/learn/courses/{slug}/nodes/`
  - `PUT /api/learn/courses/{slug}/nodes/{id}/`
  - `DELETE /api/learn/courses/{slug}/nodes/{id}/`
- **REQ-008**: Lesson node creation in tree tab must use one-step atomic API payload (`is_item=true` + nested `lesson`) and must not call any standalone lesson-create endpoint.
- **REQ-009**: Tree tab node move/reorder must use `PUT /api/learn/courses/{slug}/nodes/{id}/` with `parent_id` and/or `position` exactly.
- **REQ-010**: Clicking a lesson node in tree tab must route to `/{locale}/admin/learn/lessons/{id}`.
- **REQ-011**: Lesson editor page must provide tabs `Markdown`, `Video`, `Mini-quiz`, and `Outline` (Outline tab disabled/read-only with explicit Task 5.8 defer notice).
- **REQ-012**: Markdown tab must support editable `content_md` and real-time preview.
- **REQ-013**: Video tab must support editable `video_url` and preview (`iframe` or `video`) with validation feedback.
- **REQ-014**: Mini-quiz tab must support mapping CRUD via canonical endpoints:
  - `GET /api/learn/lessons/{id}/questions/`
  - `POST /api/learn/lessons/{id}/questions/`
  - `PUT /api/learn/lesson-questions/{id}/`
  - `DELETE /api/learn/lesson-questions/{id}/`
- **REQ-015**: Mini-quiz tab must provide quiz-filtered question selection flow:
  - load quiz list from `GET /api/quiz/quizzes/` with search/status filter support
  - on selected quiz, load question options from `GET /api/quiz/quizzes/{id}/questions/`
  - attach selected question using `POST /api/learn/lessons/{id}/questions/`
- **REQ-016**: Category/tag management must stay inline (dialog/sheet inside course list/editor pages); no separate admin routes.
- **REQ-017**: All user-facing labels/messages for new UI must be localized in both `frontend/messages/en.json` and `frontend/messages/vi.json` with identical key structure.
- **SEC-001**: Components and hooks must not call Axios directly; all HTTP calls must go through `frontend/src/services/courses.service.ts`, `frontend/src/services/lessons.service.ts`, and existing typed service modules.
- **SEC-002**: Frontend must not call Outline service directly; Outline tab in Task 5.7 only displays deferred state and no sync action.
- **SEC-003**: Admin routes must remain behind `AdminAccessGate`; no guard weakening is allowed.
- **API-001**: Task 5.7 must use canonical namespaced Learn routes only (`/api/learn/*`) and must not introduce new legacy-flat route usage.
- **API-002**: Course write payload contract must match `LearnCourseWriteSerializer` in `backend/api/serializers/course.py`.
- **API-003**: Lesson write payload contract must match `LearnLessonUpdateSerializer`; type-specific validations (`content_md` for markdown, `video_url` for video) must be surfaced in UI.
- **API-004**: Quiz/question selection in mini-quiz tab must use existing quiz APIs (`/api/quiz/quizzes/`, `/api/quiz/quizzes/{id}/questions/`) without introducing new backend endpoints.
- **CON-001**: No global question-search endpoint is required in Task 5.7; implement two-step selector (filter quiz -> choose question) using existing quiz endpoints.
- **CON-002**: Backend `LearnCourseListSerializer` currently does not expose `total_lessons`; Task 5.7 list UI must not block on this field and must render fallback metric (`user_progress.total` or `-`).
- **CON-003**: Tracked bugs H3/H7 are out-of-scope for Task 5.7 implementation and must not be treated as delivery blockers for this task.
- **CON-004**: No backend model/migration changes are in scope for Task 5.7.
- **CON-005**: Server route files (`page.tsx`) must stay thin wrappers; orchestration belongs in hooks/client components.
- **GUD-001**: Follow admin feature pattern established by Quiz admin delivery (`useAdminQuizzes`, `AdminQuiz*PageClient`).
- **GUD-002**: Prefer existing shadcn primitives (`Tabs`, `Table`, `Dialog`, `Card`, `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Skeleton`) for consistent UX.
- **PAT-001**: Keep domain state orchestration in dedicated hooks (`useAdminLearn*`) and avoid business logic inside route files.
- **PAT-002**: Keep tree mutations deterministic and idempotent from UI perspective by reloading affected branch after each mutation.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align frontend contracts and service layer for admin Learn authoring APIs.
- VAL-001: All required admin Learn service methods compile and map 1:1 to active backend routes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Extend `frontend/src/types/course.types.ts` with admin payload/read models: `AdminLearnCourseListParams`, `AdminLearnCourseMutationPayload`, `AdminLearnNodeCreatePayload`, `AdminLearnNodeUpdatePayload`, and `AdminLearnStatusTogglePayload`. |  |  |
| TASK-002 | Extend `frontend/src/types/lesson.types.ts` with admin models: `AdminLearnLessonUpdatePayload`, `AdminLearnLessonQuestionAttachPayload`, `AdminLearnLessonQuestionReorderPayload`. |  |  |
| TASK-003 | Add service methods to `frontend/src/services/courses.service.ts`: `listAdminLearnCourses`, `createAdminLearnCourse`, `updateAdminLearnCourse`, `deleteAdminLearnCourse`, `listAdminLearnCategories`, `createAdminLearnCategory`, `updateAdminLearnCategory`, `deleteAdminLearnCategory`. |  |  |
| TASK-004 | Add tag methods to `frontend/src/services/courses.service.ts`: `listAdminLearnTags`, `createAdminLearnTag`, `updateAdminLearnTag`, `deleteAdminLearnTag`. |  |  |
| TASK-005 | Add node methods to `frontend/src/services/courses.service.ts`: `createAdminLearnNode`, `updateAdminLearnNode`, `deleteAdminLearnNode`, `listAdminLearnRootNodes`, `listAdminLearnNodeChildren`. |  |  |
| TASK-006 | Add lesson-editor methods to `frontend/src/services/lessons.service.ts`: `updateLearnLesson`, `attachLearnLessonQuestion`, `updateLearnLessonQuestion`, `deleteLearnLessonQuestion`. |  |  |
| TASK-007 | Reuse/extend `frontend/src/services/quizzes.service.ts` read methods for selector flow: `listAdminQuizzes` (with search/status params) and `listAdminQuizQuestions(quizId)` for question options; create `frontend/src/lib/learn-admin-error-map.ts` for deterministic API-error to i18n-key mapping (`adminLearn.errors.*`). |  |  |

### Implementation Phase 2

- GOAL-002: Implement hook-level state orchestration for admin Learn pages.
- VAL-002: Hooks expose stable load/mutate APIs and mutation refresh behavior with localized error keys.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Create `frontend/src/hooks/useAdminLearnCourses.ts` with state groups `listState`, `detailState`, `taxonomyState`, `mutationState` and actions `loadCourseList`, `loadCourseDetail`, `submitCreateCourse`, `submitUpdateCourse`, `submitDeleteCourse`, `submitStatusToggle`. |  |  |
| TASK-009 | In `useAdminLearnCourses.ts`, persist active query params (`search`, `status`, `category`, `limit`, `offset`) for deterministic post-mutation reload. |  |  |
| TASK-010 | Create `frontend/src/hooks/useAdminLearnCourseTree.ts` with actions `loadRoot`, `expandNode`, `submitCreateFolder`, `submitCreateLessonNode`, `submitRenameNode`, `submitMoveNode`, `submitReorderNode`, `submitDeleteNode`. |  |  |
| TASK-011 | In `useAdminLearnCourseTree.ts`, implement lazy children caching keyed by parent node id and branch-only refresh after node mutation. |  |  |
| TASK-012 | Create `frontend/src/hooks/useAdminLearnLessonEditor.ts` with actions `loadLesson`, `submitLessonUpdate`, `loadLessonMappings`, `loadQuizOptions`, `loadQuizQuestionOptions`, `submitAttachMapping`, `submitReorderMapping`, `submitDeleteMapping`. |  |  |
| TASK-013 | In `useAdminLearnLessonEditor.ts`, enforce lesson-type-aware payload guards before save (`markdown -> content_md required`, `video -> video_url required`) and quiz-selection guards (`quizId` + `questionId` required before attach). |  |  |

### Implementation Phase 3

- GOAL-003: Replace Task 5.7 route skeletons with server wrappers and client containers.
- VAL-003: All Task 5.7 admin routes render client features and parse params safely.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Replace `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/page.tsx` with wrapper mounting `AdminLearnCourseListPageClient` and passing `locale`. |  |  |
| TASK-015 | Replace `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/new/page.tsx` with wrapper mounting `AdminLearnCourseCreatePageClient` and passing `locale`. |  |  |
| TASK-016 | Replace `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/[slug]/page.tsx` with wrapper mounting `AdminLearnCourseEditorPageClient` and passing `locale` + `slug`. |  |  |
| TASK-017 | Replace `frontend/app/[locale]/(admin)/admin/(protected)/learn/lessons/[id]/page.tsx` with wrapper mounting `AdminLearnLessonEditorPageClient` and passing `locale` + numeric `lessonId` guard. |  |  |
| TASK-018 | Add deterministic invalid-param fallback in lesson route wrapper for non-numeric `id` (render localized invalid-id state, no API call). |  |  |

### Implementation Phase 4

- GOAL-004: Deliver course list/create/metadata UI with inline category/tag management.
- VAL-004: Admin/editor can create/edit/archive courses and manage taxonomy inline without leaving Learn routes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Create `frontend/src/components/features/courses/admin/AdminLearnCourseListPageClient.tsx` with search/status/category toolbar, table, and row actions (`Edit`, `Delete`, `Quick status`). |  |  |
| TASK-020 | In `AdminLearnCourseListPageClient.tsx`, implement deterministic quick status toggle by sending full `updateAdminLearnCourse` payload (not partial status endpoint). |  |  |
| TASK-021 | Create `frontend/src/components/features/courses/admin/AdminLearnCourseForm.tsx` shared by create/edit metadata flows. |  |  |
| TASK-022 | Create `frontend/src/components/features/courses/admin/AdminLearnCourseCreatePageClient.tsx` and redirect to `/{locale}/admin/learn/courses/{slug}` on create success. |  |  |
| TASK-023 | Create `frontend/src/components/features/courses/admin/AdminLearnCourseEditorPageClient.tsx` with top-level tabs `Metadata` and `Tree`. |  |  |
| TASK-024 | Create `frontend/src/components/features/courses/admin/AdminLearnMetadataTab.tsx` and wire save to `submitUpdateCourse`. |  |  |
| TASK-025 | Create `frontend/src/components/features/courses/admin/AdminLearnCategoryDialog.tsx` implementing list/create/update/delete category inline actions. |  |  |
| TASK-026 | Create `frontend/src/components/features/courses/admin/AdminLearnTagDialog.tsx` implementing list/create/update/delete tag inline actions. |  |  |
| TASK-027 | Update `frontend/src/components/features/courses/README.md` with new admin components and data-flow boundaries. |  |  |

### Implementation Phase 5

- GOAL-005: Implement Tree tab authoring operations for folders and lesson nodes.
- VAL-005: Tree tab supports atomic lesson-node creation, rename, move, reorder, and subtree delete.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Create `frontend/src/components/features/courses/admin/AdminLearnTreeTab.tsx` as tree orchestration container for current course slug. |  |  |
| TASK-029 | Create `frontend/src/components/features/courses/admin/AdminLearnNodeTree.tsx` and recursive row component `AdminLearnNodeRow.tsx` for folder/item rendering with lazy expand controls. |  |  |
| TASK-030 | Implement folder creation dialog in tree tab using `createAdminLearnNode` payload `{title,parent_id,position,is_item:false}`. |  |  |
| TASK-031 | Implement atomic lesson-node creation dialog using payload `{title,parent_id,position,is_item:true,lesson:{title,lesson_type,source,content_md|video_url,...}}`. |  |  |
| TASK-032 | Implement node rename action using `updateAdminLearnNode(slug,nodeId,{title})`. |  |  |
| TASK-033 | Implement node move action using `updateAdminLearnNode(slug,nodeId,{parent_id})` with client-side self/descendant target guard. |  |  |
| TASK-034 | Implement deterministic reorder actions (move up/down) using `updateAdminLearnNode(slug,nodeId,{position})` and branch refresh after each mutation. |  |  |
| TASK-035 | Implement subtree delete confirmation + `deleteAdminLearnNode` and post-delete branch refresh. |  |  |
| TASK-036 | Implement lesson-node click navigation to `/{locale}/admin/learn/lessons/{lesson.id}` and preserve editor return-link query (`fromCourseSlug`). |  |  |

### Implementation Phase 6

- GOAL-006: Deliver lesson content editor tabs (Markdown, Video, Mini-quiz, Outline-deferred).
- VAL-006: Lesson editor can update lesson content and mini-quiz mappings using canonical APIs.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-037 | Create `frontend/src/components/features/courses/admin/AdminLearnLessonEditorPageClient.tsx` with tabs `Markdown`, `Video`, `Mini-quiz`, `Outline`. |  |  |
| TASK-038 | Create `frontend/src/components/features/courses/admin/AdminLearnLessonMarkdownTab.tsx` with split textarea/preview and save action via `submitLessonUpdate`. |  |  |
| TASK-039 | Create `frontend/src/components/features/courses/admin/AdminLearnLessonVideoTab.tsx` with `video_url` input, preview, and save action via `submitLessonUpdate`. |  |  |
| TASK-040 | Create `frontend/src/components/features/courses/admin/AdminLearnLessonMiniQuizTab.tsx` with mapping list table, quiz filter select, question select, remove action, and reorder action. |  |  |
| TASK-041 | In `AdminLearnLessonMiniQuizTab.tsx`, wire selector flow: `listAdminQuizzes` -> `listAdminQuizQuestions(selectedQuizId)` -> `attachLearnLessonQuestion(lessonId,{question_id,position})`; show backend 409/404/400 errors via `adminLearn.errors.*` keys. |  |  |
| TASK-042 | In `AdminLearnLessonMiniQuizTab.tsx`, implement mapping reorder by calling `updateLearnLessonQuestion(mappingId,{position})` only for rows whose position changed. |  |  |
| TASK-043 | In `AdminLearnLessonEditorPageClient.tsx`, implement disabled/read-only Outline tab content with explicit message: `Deferred to Task 5.8`. |  |  |

### Implementation Phase 7

- GOAL-007: Synchronize MSW/i18n/docs and run validation gates.
- VAL-007: Task 5.7 works in MSW and real-backend mode; quality gates pass; documentation close-out checklist is ready.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-044 | Extend `frontend/src/mocks/data/fixtures.ts` with mutable admin Learn fixtures for course write payloads, tree mutations, and lesson mapping mutations. |  |  |
| TASK-045 | Extend `frontend/src/mocks/handlers/courses.handlers.ts` to support all Task 5.7 admin endpoints/methods (course/category/tag/node/lesson-question writes). |  |  |
| TASK-046 | Ensure handler registration remains deterministic in `frontend/src/mocks/handlers/index.ts` and no shadow route overrides are introduced. |  |  |
| TASK-047 | Add `adminLearn.*` translation namespace and labels in `frontend/messages/en.json` and mirror identical structure in `frontend/messages/vi.json`. |  |  |
| TASK-048 | Run frontend gates in `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run build`; resolve all Task 5.7-introduced issues. |  |  |
| TASK-049 | Execute manual smoke matrix for admin Learn routes in MSW mode and real backend mode, including access checks for Admin and Editor roles. |  |  |
| TASK-050 | After implementation completion, update `docs/FE_PAGE_INVENTORY.md`, `docs/STATUS.md`, create `docs/reports/YYYY-MM-DD_slice5-task5-7-frontend-course-editor.md`, and update `openmemory.md`. |  |  |

## 3. Alternatives

- **ALT-001**: Implement Task 5.7 as one monolithic page with embedded conditionals instead of route split (`courses`, `new`, `[slug]`, `lessons/[id]`). Rejected due to poor maintainability and mismatch with current admin routing architecture.
- **ALT-002**: Add new backend endpoint `PATCH /api/learn/courses/{slug}/status/` for quick toggle. Rejected for Task 5.7 scope because no backend changes are planned; existing PUT endpoint is sufficient.
- **ALT-003**: Add new global backend endpoint for quiz-question search across all quizzes. Rejected because existing two-step selector (`/api/quiz/quizzes/` -> `/api/quiz/quizzes/{id}/questions/`) satisfies Task 5.7 with no backend expansion.
- **ALT-004**: Fully hide Outline tab until Task 5.8. Rejected because UI contract in Task 5.7 expects lesson editor tabs; deterministic disabled tab communicates defer status clearly.

## 4. Dependencies

- **DEP-001**: `docs/IMPL_PLAN.md` Slice 5 Task 5.7 route and UI contract.
- **DEP-002**: `docs/DECISIONS.md` Q-LEARN-01..10 (resolved) and defer policy for Outline sync.
- **DEP-003**: `docs/STATUS.md` active Slice 5 state and pending Task 5.7 scope.
- **DEP-004**: `backend/api/views/courses.py` viewsets `LearnCourseViewSet`, `LearnCourseNodeViewSet`, `LearnLessonViewSet`, `LearnLessonQuestionViewSet`.
- **DEP-005**: `backend/api/serializers/course.py` serializers `LearnCourseWriteSerializer`, `LearnCourseNodeWriteSerializer`, `LearnCourseNodeUpdateSerializer`, `LearnLessonUpdateSerializer`, `LearnLessonQuestionAttachSerializer`, `LearnLessonQuestionUpdateSerializer`.
- **DEP-006**: `backend/api/urls.py` canonical namespaced Learn route map under `/api/learn/*`.
- **DEP-007**: `docs/FE_CONVENTIONS.md` admin surface rules, service-layer rules, i18n parity rules.
- **DEP-008**: Existing frontend patterns from quiz admin feature (`useAdminQuizzes`, `AdminQuiz*PageClient`, `quizzes.service.ts`).
- **DEP-009**: `backend/api/views/quizzes.py` and `backend/api/urls.py` quiz list/question endpoints consumed by mini-quiz selector flow.

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/page.tsx` - route wrapper for admin course list client.
- **FILE-002**: `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/new/page.tsx` - route wrapper for admin course create client.
- **FILE-003**: `frontend/app/[locale]/(admin)/admin/(protected)/learn/courses/[slug]/page.tsx` - route wrapper for admin course editor client.
- **FILE-004**: `frontend/app/[locale]/(admin)/admin/(protected)/learn/lessons/[id]/page.tsx` - route wrapper for lesson editor client.
- **FILE-005**: `frontend/src/types/course.types.ts` - admin Learn course/node params and payload types.
- **FILE-006**: `frontend/src/types/lesson.types.ts` - admin lesson and mapping payload types.
- **FILE-007**: `frontend/src/services/courses.service.ts` - admin Learn course/category/tag/node methods.
- **FILE-008**: `frontend/src/services/lessons.service.ts` - lesson update and mapping mutation methods.
- **FILE-009**: `frontend/src/lib/learn-admin-error-map.ts` - error normalization and i18n key mapping.
- **FILE-010**: `frontend/src/hooks/useAdminLearnCourses.ts` - course list/detail/taxonomy orchestration.
- **FILE-011**: `frontend/src/hooks/useAdminLearnCourseTree.ts` - tree fetch and mutation orchestration.
- **FILE-012**: `frontend/src/hooks/useAdminLearnLessonEditor.ts` - lesson tabs and mini-quiz mapping orchestration.
- **FILE-013**: `frontend/src/components/features/courses/admin/AdminLearnCourseListPageClient.tsx` - list/table UI.
- **FILE-014**: `frontend/src/components/features/courses/admin/AdminLearnCourseCreatePageClient.tsx` - create page client.
- **FILE-015**: `frontend/src/components/features/courses/admin/AdminLearnCourseEditorPageClient.tsx` - editor page container.
- **FILE-016**: `frontend/src/components/features/courses/admin/AdminLearnCourseForm.tsx` - reusable metadata form.
- **FILE-017**: `frontend/src/components/features/courses/admin/AdminLearnMetadataTab.tsx` - metadata tab.
- **FILE-018**: `frontend/src/components/features/courses/admin/AdminLearnTreeTab.tsx` - tree tab container.
- **FILE-019**: `frontend/src/components/features/courses/admin/AdminLearnNodeTree.tsx` - recursive tree renderer.
- **FILE-020**: `frontend/src/components/features/courses/admin/AdminLearnNodeRow.tsx` - node row actions.
- **FILE-021**: `frontend/src/components/features/courses/admin/AdminLearnCategoryDialog.tsx` - inline category CRUD dialog.
- **FILE-022**: `frontend/src/components/features/courses/admin/AdminLearnTagDialog.tsx` - inline tag CRUD dialog.
- **FILE-023**: `frontend/src/components/features/courses/admin/AdminLearnLessonEditorPageClient.tsx` - lesson editor container.
- **FILE-024**: `frontend/src/components/features/courses/admin/AdminLearnLessonMarkdownTab.tsx` - markdown tab UI.
- **FILE-025**: `frontend/src/components/features/courses/admin/AdminLearnLessonVideoTab.tsx` - video tab UI.
- **FILE-026**: `frontend/src/components/features/courses/admin/AdminLearnLessonMiniQuizTab.tsx` - mini-quiz mapping tab UI.
- **FILE-027**: `frontend/src/components/features/courses/README.md` - include admin Learn component inventory.
- **FILE-028**: `frontend/src/mocks/data/fixtures.ts` - mutable fixtures for admin Learn flows.
- **FILE-029**: `frontend/src/mocks/handlers/courses.handlers.ts` - write handlers for admin Learn operations.
- **FILE-030**: `frontend/src/mocks/handlers/index.ts` - verify handler registration order.
- **FILE-031**: `frontend/messages/en.json` - add `adminLearn.*` keys.
- **FILE-032**: `frontend/messages/vi.json` - add `adminLearn.*` keys with parity.
- **FILE-033**: `docs/FE_PAGE_INVENTORY.md` - mark Task 5.7 pages implemented after completion.
- **FILE-034**: `docs/STATUS.md` - mark Slice 5 Task 5.7 completed after validation.
- **FILE-035**: `docs/reports/YYYY-MM-DD_slice5-task5-7-frontend-course-editor.md` - mandatory session report after implementation completion.
- **FILE-036**: `openmemory.md` - post-session pattern/status update.

## 6. Testing

- **TEST-001**: Route wrapper test: `/{locale}/admin/learn/courses` loads `AdminLearnCourseListPageClient` and shows localized title.
- **TEST-002**: Route wrapper test: `/{locale}/admin/learn/courses/new` loads create form and submits valid payload.
- **TEST-003**: Route wrapper test: `/{locale}/admin/learn/courses/{slug}` loads tabs and fetches metadata/tree.
- **TEST-004**: Route wrapper test: `/{locale}/admin/learn/lessons/{id}` numeric id works; invalid id renders deterministic invalid-id state.
- **TEST-005**: Course create test: submit valid course payload and verify redirect to editor route.
- **TEST-006**: Course update test: metadata edit persists via `PUT /api/learn/courses/{slug}/` and shows success feedback.
- **TEST-007**: Course status quick-toggle test: row status transition updates without page reload.
- **TEST-008**: Taxonomy inline test: create/update/delete category and tag in dialogs refreshes selectors immediately.
- **TEST-009**: Tree create folder test: folder appears at expected parent branch after create.
- **TEST-010**: Tree create lesson node test: item node appears with lesson summary and navigates to lesson editor route.
- **TEST-011**: Tree rename/move/reorder test: node title, parent placement, and sibling order update deterministically after mutation.
- **TEST-012**: Tree delete test: subtree delete removes nodes from UI and refreshes affected branch.
- **TEST-013**: Lesson markdown tab test: content_md edit/save updates preview and survives page refresh.
- **TEST-014**: Lesson video tab test: video_url edit/save updates preview and validates required field.
- **TEST-015**: Lesson mini-quiz selector test: filter/select quiz loads question options from selected quiz and attaches chosen question successfully.
- **TEST-016**: Lesson mini-quiz mapping reorder/delete test: changed positions are persisted and mapping delete refreshes list.
- **TEST-017**: Outline tab test: tab is visible but read-only and displays explicit `Deferred to Task 5.8` message.
- **TEST-018**: Access-control smoke: unauthenticated user is redirected to admin login; admin/editor tokens can access all Task 5.7 routes.
- **TEST-019**: i18n parity test: every `adminLearn.*` key exists in both `en.json` and `vi.json` with identical path.
- **TEST-020**: Command gate test: `npm run lint` passes in `frontend/`.
- **TEST-021**: Command gate test: `npx tsc --noEmit` passes in `frontend/`.
- **TEST-022**: Command gate test: `npm run build` passes in `frontend/`.

## 7. Risks & Assumptions

- **RISK-001**: Quiz/question selector can produce heavy network usage if each quiz switch triggers uncached question loads; cache selected quiz question lists in hook state.
- **RISK-002**: `total_lessons` is not directly provided by current course list serializer; displaying fallback metric can differ from desired product wording.
- **RISK-003**: Tree mutation concurrency (multiple edits by different editors) can temporarily show stale local order without full-branch reload after each mutation.
- **RISK-004**: Taxonomy inline CRUD across list/editor pages can drift if local caches are not synchronized after mutation.
- **ASSUMPTION-001**: Canonical admin Learn runtime routes remain `/{locale}/admin/learn/courses*` and `/{locale}/admin/learn/lessons/{id}`.
- **ASSUMPTION-002**: Backend Learn API contracts in `backend/api/views/courses.py` and `backend/api/serializers/course.py` stay stable during Task 5.7 implementation.
- **ASSUMPTION-003**: Task 5.8 owns all real Outline sync actions; Task 5.7 only reserves UI affordance.
- **ASSUMPTION-004**: Existing `AdminLayout` link to `/{locale}/admin/learn/courses` remains canonical and does not require route remapping.

## 8. Related Specifications / Further Reading

docs/IMPL_PLAN.md
docs/STATUS.md
docs/DECISIONS.md
docs/API.md
docs/API_ROUTE_MAPPING.md
docs/ARCHITECTURE.md
docs/FE_CONVENTIONS.md
docs/FE_PAGE_INVENTORY.md
docs/FE_SETUP.md
docs/prd/03-learn.md
docs/RELEASE_CHECKLIST_SLICE5_8.md
CLAUDE.md
AGENT.md
DEV_WORKFLOW.md
