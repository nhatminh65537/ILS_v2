---
goal: Slice 5 Task 5.6 Frontend Lesson Viewer Delivery
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Frontend Team
status: 'Planned'
tags: [feature, learn, frontend, lesson-viewer, slice5]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic, machine-executable implementation steps for Slice 5 Task 5.6 to deliver the user-facing lesson viewer at `/{locale}/courses/{slug}/lessons/{id}` with markdown, video, and miniquiz rendering, explicit lesson start, hybrid completion UX, course-tree navigation, and progress/next-prev controls.

## 1. Requirements & Constraints

- **REQ-001**: Replace the current skeleton lesson page at `frontend/app/[locale]/(catalog)/courses/[slug]/lessons/[id]/page.tsx` with a server-wrapper that delegates all interactive behavior to a dedicated client component.
- **REQ-002**: Support exactly three lesson types from backend payload (`lesson_type`): `markdown`, `video`, `miniquiz`.
- **REQ-003**: Render a left sidebar containing the course tree with current-lesson highlight and clickable lesson links.
- **REQ-004**: Render a right sidebar with course progress summary, explicit lesson start/complete actions, and deterministic previous/next lesson navigation.
- **REQ-005**: Implement explicit start trigger per resolved decision Q-LEARN-09 Option B: call `POST /api/learn/lessons/{id}/progress/start/` only from a user action (`Start lesson` button), not automatically on mount.
- **REQ-006**: Implement hybrid completion UX per resolved decision Q-LEARN-08 Option D: guided completion signals per lesson type plus explicit complete action (`POST /api/learn/lessons/{id}/progress/complete/`).
- **REQ-007**: Use canonical namespaced Learn endpoints only for new work:
  - `GET /api/learn/lessons/{id}/`
  - `GET /api/learn/lessons/{id}/questions/`
  - `POST /api/learn/lessons/{id}/progress/start/`
  - `POST /api/learn/lessons/{id}/progress/complete/`
  - `GET /api/learn/courses/{slug}/nodes/`
  - `GET /api/learn/courses/{slug}/nodes/{id}/children/`
  - `GET /api/learn/courses/{slug}/progress/`
- **REQ-008**: Miniquiz lessons must render inline question cards using question mappings from `GET /api/learn/lessons/{id}/questions/` and provide answer reveal locally in UI.
- **REQ-009**: Route-level behavior must keep user-surface catalog architecture in `(catalog)` route group and must not introduce navigation sidebar logic into shared layout.
- **REQ-010**: Viewer must handle `404` lesson visibility behavior (member cannot access lesson in draft course) with localized error fallback and back-navigation.
- **REQ-011**: Viewer must keep compatibility with Task 5.5 services/hooks/stores and avoid breaking `/{locale}/courses` and `/{locale}/courses/{slug}` pages.
- **REQ-012**: User-facing text must be localized via `next-intl` and key trees in `frontend/messages/en.json` and `frontend/messages/vi.json` must remain structurally identical.
- **SEC-001**: Frontend must not call Outline directly; only backend Learn APIs are allowed.
- **SEC-002**: Markdown rendering must not enable unsafe raw HTML parsing (`rehype-raw` is forbidden); rendering pipeline must stay sanitized by default behavior.
- **SEC-003**: Miniquiz answer correctness (`is_correct`) must not be shown before user submits/reveals answer state in the current card.
- **API-001**: Lesson detail typing must match backend `LearnLessonDetailSerializer` fields exactly (`id`, `title`, `lesson_type`, `source`, `content_md`, `video_url`, `video_duration`, `learning_point`, `learning_time`).
- **API-002**: Miniquiz mappings typing must match backend `LearnLessonQuestionSerializer` (`id`, `lesson`, `question`, `position`), where `question` aligns with `QuizQuestionSerializer`.
- **API-003**: Progress actions must treat backend idempotency as canonical: repeated `start` and `complete` actions must not break frontend state.
- **CON-001**: Components and hooks must not call Axios directly; all HTTP must be routed via `frontend/src/services/*`.
- **CON-002**: Keep existing `frontend/src/hooks/useCourses.ts` and `frontend/src/stores/courses.store.ts` as the canonical Learn domain state flow; extend them instead of introducing a parallel duplicated domain state.
- **CON-003**: Viewer layout must be responsive: desktop shows left tree + center content + right progress/nav; mobile collapses side panels into stacked sections without breaking actions.
- **CON-004**: Package additions must be recorded in `frontend/package.json` and must pass existing build pipeline (`lint`, `tsc`, `next build`).
- **CON-005**: Outline integration/sync is explicitly out of scope for Task 5.6 and must not be included in implementation; Outline work remains in Task 5.8.
- **CON-006**: Documentation drift detected: `docs/FE_PAGE_INVENTORY.md` still marks Task 5.5 course pages as skeleton while `docs/STATUS.md` marks Task 5.5 completed. Treat as doc normalization item; do not block Task 5.6 implementation.
- **GUD-001**: Follow FE conventions for catalog route-group pattern and service/store/hook layering.
- **GUD-002**: Reuse existing UI primitives (`Card`, `Button`, `Badge`, `Skeleton`, `Input`, `Checkbox`, `RadioGroup`) for visual consistency.
- **PAT-001**: Keep orchestration in hook/store layer; page and feature components remain presentation-focused.
- **PAT-002**: Use deterministic helper functions for tree flattening and previous/next lesson derivation, avoiding implicit ordering behavior.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish lesson-viewer contracts and dependency baseline aligned with backend serializers/endpoints.
- VAL-001: Service/type layer compiles and maps 1:1 to canonical Learn APIs.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add frontend dependencies in `frontend/package.json`: `react-markdown`, `rehype-highlight`, and `remark-gfm` for markdown + code highlighting pipeline. |  |  |
| TASK-002 | Create `frontend/src/types/lesson.types.ts` with exact DTOs: `LearnLessonDetail`, `LearnLessonQuestionMapping`, `LearnLessonProgress`, `LessonCompletionSignal`, and `MiniquizAnswerState`. |  |  |
| TASK-003 | Update `frontend/src/types/course.types.ts` to import/export lesson-viewer-safe shared lesson enums/types without breaking existing Task 5.5 consumers. |  |  |
| TASK-004 | Create `frontend/src/services/lessons.service.ts` with canonical methods: `getLearnLessonById`, `listLearnLessonQuestions`, `startLearnLessonProgress`, `completeLearnLessonProgress`. |  |  |
| TASK-005 | In `frontend/src/services/lessons.service.ts`, normalize error mapping for endpoint-specific failure modes (`400` non-miniquiz questions, `404` hidden lesson, `403` authz). |  |  |
| TASK-006 | Update `frontend/src/services/README.md` to include the new lessons service and exact endpoint contract references for Task 5.6. |  |  |

### Implementation Phase 2

- GOAL-002: Extend Learn domain state and orchestration for lesson-viewer flows.
- VAL-002: Hook/store layer can load lesson detail, questions, progress actions, and navigation context deterministically.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Extend `frontend/src/stores/courses.store.ts` state with lesson-viewer fields: `activeLesson`, `lessonQuestions`, `lessonProgress`, `isLessonLoading`, `isLessonQuestionsLoading`, `isLessonProgressSubmitting`, `lessonError`, `isStarted`, `isCompleted`. |  |  |
| TASK-008 | Add corresponding actions in `courses.store.ts`: `setActiveLesson`, `setLessonQuestions`, `setLessonProgress`, `setLessonLoading`, `setLessonQuestionsLoading`, `setLessonProgressSubmitting`, `setLessonError`, `setStarted`, `setCompleted`, `resetLessonState`. |  |  |
| TASK-009 | Extend `frontend/src/hooks/useCourses.ts` with async methods `loadLessonById`, `loadLessonQuestions`, `startLesson`, `completeLesson` using `lessons.service.ts`. |  |  |
| TASK-010 | Add helper `loadAllCourseNodesForNavigation(slug)` in `useCourses.ts` that recursively fetches all folder children through `/nodes/{id}/children/` and populates `childrenByParentId`. |  |  |
| TASK-011 | Create deterministic navigation helper file `frontend/src/lib/learn-navigation.ts` with `flattenLessonNodes` and `findNeighborLessons` pure functions using `position` + `id` stable sorting. |  |  |
| TASK-012 | Add completion-signal helper file `frontend/src/lib/lesson-completion.ts` with `deriveMarkdownSignal`, `deriveVideoSignal`, and `deriveMiniquizSignal` to support hybrid completion UX without implicit backend mutations. |  |  |

### Implementation Phase 3

- GOAL-003: Implement lesson-viewer UI components for markdown/video/miniquiz rendering and side-panel navigation.
- VAL-003: Lesson viewer route renders correct content by `lesson_type`, supports explicit start/complete, and shows deterministic prev/next links.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create `frontend/src/components/features/courses/LessonViewerClient.tsx` as the main orchestration component accepting props `{ locale: string; slug: string; lessonId: number }`. |  |  |
| TASK-014 | In `LessonViewerClient.tsx`, load viewer context on mount: `loadLessonById`, `loadCourseDetail`, `loadCourseProgress`, `loadRootNodes`, and `loadAllCourseNodesForNavigation`. |  |  |
| TASK-015 | Create `frontend/src/components/features/courses/LessonCourseTreeSidebar.tsx` to render full course tree with current lesson highlight and navigable lesson links. |  |  |
| TASK-016 | Create `frontend/src/components/features/courses/LessonProgressSidebar.tsx` containing: explicit start button, explicit complete button, completion-signal indicator, course progress summary, and prev/next lesson links. |  |  |
| TASK-017 | Create `frontend/src/components/features/courses/LessonMarkdownContent.tsx` using `react-markdown + remark-gfm + rehype-highlight` and safe rendering rules (no raw HTML plugin). |  |  |
| TASK-018 | Create `frontend/src/components/features/courses/LessonVideoContent.tsx` supporting `<video>` for direct media and `<iframe>` fallback for embed URLs; emit watched-threshold signal at 80%. |  |  |
| TASK-019 | Create `frontend/src/components/features/courses/LessonMiniQuizContent.tsx` for inline miniquiz cards with local answer capture and reveal state, based on `LearnLessonQuestionMapping[]`. |  |  |
| TASK-020 | In `LessonMiniQuizContent.tsx`, reuse question rendering primitives from existing quiz feature patterns (`QuestionType`, `Checkbox`, `RadioGroup`, `Input`) for UI consistency. |  |  |
| TASK-021 | In `LessonViewerClient.tsx`, branch rendering by `lesson.lesson_type` and connect guided completion signals to right-sidebar CTA state (signal visible + explicit complete action still available). |  |  |
| TASK-022 | In `LessonViewerClient.tsx`, implement localized loading/error/empty/not-found states and back-link `/{locale}/courses/{slug}`. |  |  |

### Implementation Phase 4

- GOAL-004: Wire route entry and maintain route-level contract integrity.
- VAL-004: `/{locale}/courses/{slug}/lessons/{id}` route is fully functional and isolated to Task 5.6 scope.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Replace `frontend/app/[locale]/(catalog)/courses/[slug]/lessons/[id]/page.tsx` skeleton with server wrapper that parses params and renders `<LessonViewerClient locale={locale} slug={slug} lessonId={Number(id)} />`. |  |  |
| TASK-024 | Add invalid-id guard in route wrapper: when `id` is not a positive integer, render deterministic not-found fallback UI instead of sending malformed API requests. |  |  |
| TASK-025 | Validate lesson-course consistency in `LessonViewerClient.tsx` by checking lesson ID exists in flattened tree for the current slug; on mismatch show localized access/not-found state. |  |  |
| TASK-026 | Keep `frontend/app/[locale]/(catalog)/courses/page.tsx` and `frontend/app/[locale]/(catalog)/courses/[slug]/page.tsx` unchanged except imports needed for shared helper reuse. |  |  |

### Implementation Phase 5

- GOAL-005: Align MSW fixtures/handlers for lesson-viewer APIs and state transitions.
- VAL-005: Task 5.6 page works in MSW mode with realistic lesson type permutations and idempotent progress behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Extend `frontend/src/mocks/data/fixtures.ts` with lesson-detail fixture map keyed by lesson id for markdown/video/miniquiz samples aligned to `LearnLessonDetailSerializer`. |  |  |
| TASK-028 | Extend `fixtures.ts` with miniquiz mapping fixtures keyed by lesson id that include `question` payloads matching backend `QuizQuestionSerializer` shape. |  |  |
| TASK-029 | Extend `fixtures.ts` with lesson progress fixture map to simulate `started_at` and `completed_at` transitions and idempotent repeats. |  |  |
| TASK-030 | Update `frontend/src/mocks/handlers/courses.handlers.ts` with `GET /api/learn/lessons/:id/` handler returning typed lesson detail or `404`. |  |  |
| TASK-031 | Update `courses.handlers.ts` with `GET /api/learn/lessons/:id/questions/` handler; return `400` for non-miniquiz lessons and mapping array for miniquiz lessons. |  |  |
| TASK-032 | Update `courses.handlers.ts` with `POST /api/learn/lessons/:id/progress/start/` handler implementing idempotent start semantics. |  |  |
| TASK-033 | Update `courses.handlers.ts` with `POST /api/learn/lessons/:id/progress/complete/` handler implementing idempotent completion semantics. |  |  |
| TASK-034 | Keep `frontend/src/mocks/handlers/index.ts` registration order valid and ensure new lesson handlers stay within `coursesHandlers` contract boundaries. |  |  |

### Implementation Phase 6

- GOAL-006: Complete localization and feature documentation updates for lesson viewer.
- VAL-006: Lesson viewer uses fully localized text in both locales with identical key structure and updated feature docs.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-035 | Add lesson-viewer keys under `courses.lessonViewer.*` in `frontend/messages/en.json` for labels, buttons, errors, completion hints, and miniquiz reveal states. |  |  |
| TASK-036 | Add matching key structure under `courses.lessonViewer.*` in `frontend/messages/vi.json` with key-path parity to English locale. |  |  |
| TASK-037 | Update `frontend/src/components/features/courses/README.md` with new Task 5.6 component list and data-flow boundaries. |  |  |
| TASK-038 | Update `docs/FE_PAGE_INVENTORY.md` row for lesson viewer route to `implemented` when implementation is merged, and normalize any stale Slice 5 status rows in the same session. |  |  |

### Implementation Phase 7

- GOAL-007: Validate quality gates and execution readiness.
- VAL-007: Viewer passes static checks and manual flow verification across lesson types.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-039 | Run `npm run lint` in `frontend/` and fix all Task 5.6-introduced lint errors. |  |  |
| TASK-040 | Run `npx tsc --noEmit` in `frontend/` and fix all Task 5.6-introduced type errors. |  |  |
| TASK-041 | Run `npm run build` in `frontend/` and fix all Task 5.6-introduced build errors. |  |  |
| TASK-042 | Execute manual smoke matrix in MSW mode for three lesson types (markdown/video/miniquiz): route load, explicit start, guided signal, explicit complete, prev/next navigation, and error fallbacks. |  |  |
| TASK-043 | Execute manual smoke matrix against real backend (MSW disabled): member published lesson pass, draft lesson 404, non-miniquiz questions endpoint handling, idempotent start/complete actions. |  |  |
| TASK-044 | On implementation completion, update `docs/STATUS.md`, create session report in `docs/reports/`, and update `openmemory.md` per required session close workflow. |  |  |

## 3. Alternatives

- **ALT-001**: Keep lesson viewer as a simple server-rendered page with raw HTML/video tags and no interactive progress actions. Rejected because it cannot satisfy explicit start/hybrid completion requirements.
- **ALT-002**: Create a separate lesson domain store instead of extending `courses.store.ts`. Rejected to avoid domain state duplication and split-brain cache behavior within Slice 5 Learn frontend.
- **ALT-003**: Fetch only current lesson and omit full tree preloading; compute prev/next from URL query hints. Rejected because it yields nondeterministic navigation and breaks route-deep-link behavior.
- **ALT-004**: Use legacy `/api/lessons/*` routes for speed. Rejected because route-mapping rules require canonical `/api/learn/*` for all new work.

## 4. Dependencies

- **DEP-001**: Backend Learn lesson endpoints and contracts in `backend/api/urls.py` and `backend/api/views/courses.py` (`LearnLessonViewSet`, `LearnLessonQuestionViewSet`).
- **DEP-002**: Backend Learn serializers in `backend/api/serializers/course.py` (`LearnLessonDetailSerializer`, `LearnLessonQuestionSerializer`, `UserLessonProgressSerializer`).
- **DEP-003**: Existing Task 5.5 frontend Learn state and tree pipeline (`useCourses`, `courses.store`, `courses.service`).
- **DEP-004**: FE architecture and route-group constraints in `docs/FE_CONVENTIONS.md`.
- **DEP-005**: Slice 5 contracts and decisions in `docs/IMPL_PLAN.md`, `docs/DECISIONS.md`, and `docs/prd/03-learn.md`.
- **DEP-006**: Markdown rendering dependencies: `react-markdown`, `remark-gfm`, `rehype-highlight`.
- **DEP-007**: Existing quiz question type contracts in `frontend/src/types/quiz.types.ts` for miniquiz rendering reuse.

## 5. Files

- **FILE-001**: `frontend/package.json` - add markdown/highlight dependencies.
- **FILE-002**: `frontend/src/types/lesson.types.ts` - lesson viewer DTOs and local UI state types.
- **FILE-003**: `frontend/src/types/course.types.ts` - shared lesson type export alignment.
- **FILE-004**: `frontend/src/services/lessons.service.ts` - canonical Learn lesson API client.
- **FILE-005**: `frontend/src/services/README.md` - services inventory update.
- **FILE-006**: `frontend/src/stores/courses.store.ts` - lesson viewer state extensions.
- **FILE-007**: `frontend/src/hooks/useCourses.ts` - lesson-viewer orchestration methods.
- **FILE-008**: `frontend/src/lib/learn-navigation.ts` - deterministic flatten/neighbor utilities.
- **FILE-009**: `frontend/src/lib/lesson-completion.ts` - completion signal utilities.
- **FILE-010**: `frontend/src/components/features/courses/LessonViewerClient.tsx` - main lesson-viewer client.
- **FILE-011**: `frontend/src/components/features/courses/LessonCourseTreeSidebar.tsx` - left tree sidebar.
- **FILE-012**: `frontend/src/components/features/courses/LessonProgressSidebar.tsx` - right progress/navigation sidebar.
- **FILE-013**: `frontend/src/components/features/courses/LessonMarkdownContent.tsx` - markdown renderer.
- **FILE-014**: `frontend/src/components/features/courses/LessonVideoContent.tsx` - video renderer.
- **FILE-015**: `frontend/src/components/features/courses/LessonMiniQuizContent.tsx` - inline miniquiz renderer.
- **FILE-016**: `frontend/src/components/features/courses/README.md` - feature component inventory update.
- **FILE-017**: `frontend/app/[locale]/(catalog)/courses/[slug]/lessons/[id]/page.tsx` - route wrapper replacement.
- **FILE-018**: `frontend/src/mocks/data/fixtures.ts` - lesson fixtures and progress fixtures.
- **FILE-019**: `frontend/src/mocks/handlers/courses.handlers.ts` - lesson endpoint handlers.
- **FILE-020**: `frontend/messages/en.json` - lesson viewer English i18n keys.
- **FILE-021**: `frontend/messages/vi.json` - lesson viewer Vietnamese i18n keys.
- **FILE-022**: `docs/FE_PAGE_INVENTORY.md` - route implementation status update after merge.
- **FILE-023**: `docs/STATUS.md` - completion tracking update after verification.
- **FILE-024**: `docs/reports/YYYY-MM-DD_slice5-task5-6-frontend-lesson-viewer.md` - mandatory completion report.
- **FILE-025**: `openmemory.md` - post-session pattern/status memory update.

## 6. Testing

- **TEST-001**: Route load test: `/{locale}/courses/{slug}/lessons/{id}` renders localized shell and lesson title.
- **TEST-002**: Explicit start test: no `start` API call on initial mount; one `POST /progress/start/` call only after user clicks start button.
- **TEST-003**: Start idempotency test: repeated start clicks do not break UI state and remain consistent with backend response.
- **TEST-004**: Markdown rendering test: markdown content renders headings/lists/code blocks with highlight classes and without unsafe raw HTML execution.
- **TEST-005**: Video rendering test: direct media URL renders `<video>`; embed URL renders `<iframe>` fallback.
- **TEST-006**: Hybrid completion signal test: markdown scroll threshold, video watch threshold, and miniquiz answered-state all update completion hint UI.
- **TEST-007**: Explicit complete test: complete action calls `POST /progress/complete/`, updates local completion state, and refreshes right-sidebar summary.
- **TEST-008**: Miniquiz mapping test: miniquiz lesson loads questions, accepts answer input, and reveals correctness only after submit/reveal action.
- **TEST-009**: Non-miniquiz endpoint handling test: `GET /questions/` returning `400` is handled as expected with non-crashing UI path.
- **TEST-010**: Navigation test: prev/next links are deterministic for current lesson based on flattened tree ordering.
- **TEST-011**: Visibility/authorization test: member access to draft-course lesson returns not-found fallback (no data leak).
- **TEST-012**: Locale parity test: all new `courses.lessonViewer.*` keys exist in both `en.json` and `vi.json` with identical key paths.
- **TEST-013**: Command gate test: `npm run lint` passes.
- **TEST-014**: Command gate test: `npx tsc --noEmit` passes.
- **TEST-015**: Command gate test: `npm run build` passes.

## 7. Risks & Assumptions

- **RISK-001**: Recursive tree preloading for navigation may increase request count on very deep trees.
- **RISK-002**: Markdown highlight theming may appear inconsistent if no code-block style tuning is added after dependency install.
- **RISK-003**: Miniquiz local reveal logic can diverge from future backend scoring semantics if question payload format evolves.
- **RISK-004**: Existing active admin-route authz bug (H3/H7) may interfere with broader cross-surface manual validation scripts, though user-surface lesson viewer is still implementable.
- **RISK-005**: Documentation drift (`RELEASE_CHECKLIST` and `FE_PAGE_INVENTORY`) can cause reviewer confusion unless normalized during close-out.
- **ASSUMPTION-001**: Canonical runtime user route for lesson viewer remains `/{locale}/courses/{slug}/lessons/{id}` under `(catalog)` group.
- **ASSUMPTION-002**: Backend Task 5.3/5.4 lesson and progress endpoints remain stable during Task 5.6 implementation.
- **ASSUMPTION-003**: Existing question payloads from `QuizQuestionSerializer` remain sufficient for inline miniquiz rendering without additional backend fields.
- **ASSUMPTION-004**: No additional backend endpoint is required to compute prev/next lesson; frontend can derive it from recursively loaded node tree.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/API.md](../docs/API.md)
[docs/API_ROUTE_MAPPING.md](../docs/API_ROUTE_MAPPING.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
[docs/FE_CONVENTIONS.md](../docs/FE_CONVENTIONS.md)
[docs/FE_PAGE_INVENTORY.md](../docs/FE_PAGE_INVENTORY.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
[docs/TEAM_PLAN.md](../docs/TEAM_PLAN.md)
[AGENT.md](../AGENT.md)
[CLAUDE.md](../CLAUDE.md)
[DEV_WORKFLOW.md](../DEV_WORKFLOW.md)
