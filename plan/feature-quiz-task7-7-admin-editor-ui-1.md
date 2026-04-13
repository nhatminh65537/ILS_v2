---
goal: Feature plan for Slice 7 Task 7.7 Frontend Quiz Editor (admin/editor surface)
version: 1.0
date_created: 2026-04-13
last_updated: 2026-04-13
owner: Frontend Team B
status: Planned
tags: [feature, frontend, quiz, admin-surface, slice-7, task-7.7]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 7 Task 7.7: deliver the admin/editor quiz authoring surface under `/{locale}/admin/quizzes/*` using canonical namespaced quiz APIs (`/api/quiz/quizzes/*`) and current frontend conventions. Scope includes quiz list, create form, metadata editor, and question manager with typed forms for `single_choice`, `multi_choice`, and `fill_blank` questions.

## 1. Requirements & Constraints

- **REQ-001**: Implement four route entries under `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/`: `page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/questions/page.tsx`.
- **REQ-002**: Quiz list page must show columns: `title`, `status`, `total_questions`, `quiz_point`, `time_limit_sec`, `updated_at` and row actions `Edit`, `Questions`, `Delete`.
- **REQ-003**: Create page must submit `POST /api/quiz/quizzes/` with fields `title`, `description`, `status`, `quiz_point`, `time_limit_sec` and optional `category_id` when available.
- **REQ-004**: Metadata page must submit `PATCH /api/quiz/quizzes/{id}/` and support status transitions `draft|published|archived`.
- **REQ-005**: Question manager must load from `GET /api/quiz/quizzes/{id}/questions/` and support create/update/delete via `/questions/` and `/questions/{qid}/`.
- **REQ-006**: Question create and update payloads must follow serializer contract in `backend/api/serializers.py` (`QuizQuestionManageSerializer`): `question_type`, `content.text`, `explanation`, `case_sensitive`, `score`, `position`, `options[]`, `answers[]`.
- **REQ-007**: For `single_choice`, exactly one option with `is_correct=true` must be enforced client-side before submit.
- **REQ-008**: For `multi_choice`, at least one option with `is_correct=true` must be enforced client-side before submit.
- **REQ-009**: For `fill_blank`, at least one non-empty `answers[].answer` must be enforced client-side before submit.
- **REQ-010**: Question reorder must be persisted by deterministic sequence updates: `PUT /api/quiz/quizzes/{id}/questions/{qid}/` with updated `position` for each changed row.
- **REQ-011**: Question preview mode must render question content using the same member-facing component contract as existing quiz session components.
- **REQ-012**: Admin sidebar and top navigation must include `/{locale}/admin/quizzes` link.
- **SEC-001**: All HTTP calls must go through `frontend/src/services/quizzes.service.ts`; no direct Axios in components or hooks.
- **SEC-002**: Admin routes must remain behind `AdminAccessGate`; do not weaken existing guard logic.
- **SEC-003**: No answer correctness data must be displayed outside admin/editor pages.
- **API-001**: Use canonical namespaced endpoints only for new code (`/api/quiz/quizzes/*`); do not add new usage of legacy flat endpoints.
- **API-002**: Service methods must normalize list payloads to support both bare arrays and DRF paginated envelopes.
- **API-003**: Category/tag controls must be implemented as inline controls on list/editor pages, with no separate route creation.
- **CON-001**: Do not modify backend models or migrations in Task 7.7.
- **CON-002**: Preserve locale-first routing and admin surface isolation (`/{locale}/admin/*`).
- **CON-003**: Use shadcn components for all form selects and dialogs; do not use native HTML `<select>`.
- **CON-004**: Keep i18n parity between `frontend/messages/en.json` and `frontend/messages/vi.json`.
- **GUD-001**: Server route files (`page.tsx`) should only parse params and mount client feature components.
- **GUD-002**: Reuse existing hook pattern (`data + isLoading + errorKey + mutation state`) used in `useAdminUsers.ts` and `useRbac.ts`.
- **PAT-001**: Keep feature state orchestration in hooks, not in route files.
- **PAT-002**: Keep mock handlers registered in `frontend/src/mocks/handlers/index.ts` with deterministic ordering.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align quiz admin contracts in types and service layer. Completion criteria: all required admin CRUD/question methods compile and map to canonical `/api/quiz/quizzes/*` paths.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In `frontend/src/types/quiz.types.ts`, add admin-specific DTOs: `AdminQuizListParams`, `AdminQuizMutationPayload`, `AdminQuizQuestionMutationPayload`, `QuizQuestionOptionInput`, `QuizQuestionAnswerInput`, and strict union helper `AdminQuestionFormState`. |  |  |
| TASK-002 | In `frontend/src/types/quiz.types.ts`, add parser-safe response types `QuizQuestionsListResponse` and `QuizListResponse` to handle `readonly T[]` and paginated shapes. |  |  |
| TASK-003 | In `frontend/src/services/quizzes.service.ts`, add `listAdminQuizzes(params)`, `createAdminQuiz(payload)`, `updateAdminQuiz(id,payload)`, `deleteAdminQuiz(id)` mapped to `/api/quiz/quizzes/`. |  |  |
| TASK-004 | In `frontend/src/services/quizzes.service.ts`, add `listAdminQuizQuestions(quizId)`, `createAdminQuizQuestion(quizId,payload)`, `updateAdminQuizQuestion(quizId,questionId,payload)`, `deleteAdminQuizQuestion(quizId,questionId)` mapped to nested canonical routes. |  |  |
| TASK-005 | In `frontend/src/services/quizzes.service.ts`, add internal helpers `normalizeQuizListResponse` and `normalizeQuizQuestionListResponse`; return arrays from all list methods regardless of backend envelope shape. |  |  |

### Implementation Phase 2

- GOAL-002: Implement deterministic admin quiz state orchestration hooks. Completion criteria: hooks expose stable load/mutate APIs with localized error keys and refresh behavior after each mutation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `frontend/src/hooks/useAdminQuizzes.ts` with states `listState`, `paginationState`, `detailState`, `isMutating`, `mutationErrorKey`, and actions `loadList`, `loadDetail`, `submitCreate`, `submitUpdate`, `submitDelete`. |  |  |
| TASK-007 | In `useAdminQuizzes.ts`, implement list filtering params: `search`, `status`, `limit`, `offset`; persist active params for post-mutation refresh (same pattern as `useAdminUsers.ts`). |  |  |
| TASK-008 | Create `frontend/src/hooks/useAdminQuizQuestions.ts` with actions `loadQuestions`, `submitCreateQuestion`, `submitUpdateQuestion`, `submitDeleteQuestion`, `submitReorderQuestions`. |  |  |
| TASK-009 | In `useAdminQuizQuestions.ts`, implement `submitReorderQuestions` deterministic algorithm: compute changed rows only, send sequential `updateAdminQuizQuestion` calls with incremented `position`, then reload list. |  |  |
| TASK-010 | Add mapping helpers in `frontend/src/lib/quiz-admin-error-map.ts` to translate API errors into i18n keys (`adminQuizzes.errors.*`). |  |  |

### Implementation Phase 3

- GOAL-003: Deliver admin route entries and page-level client containers. Completion criteria: all four Task 7.7 routes render and navigate correctly from admin shell.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Add `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/page.tsx` mounting `AdminQuizListPageClient` with locale param. |  |  |
| TASK-012 | Add `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/new/page.tsx` mounting `AdminQuizCreatePageClient` with locale param. |  |  |
| TASK-013 | Add `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/[id]/page.tsx` mounting `AdminQuizEditorPageClient` with locale and numeric id. |  |  |
| TASK-014 | Add `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/[id]/questions/page.tsx` mounting `AdminQuizQuestionsPageClient`. |  |  |
| TASK-015 | Update `frontend/src/components/layouts/AdminLayout.tsx` and `frontend/app/[locale]/(admin)/admin/(protected)/layout.tsx` to include `quizzesLabel` prop and link `/${locale}/admin/quizzes` in sidebar/top links. |  |  |

### Implementation Phase 4

- GOAL-004: Build admin quiz UI components for list, metadata form, and question manager. Completion criteria: create/edit/delete workflows are operational in MSW mode for all question types.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Create `frontend/src/components/features/quizzes/AdminQuizListPageClient.tsx` with toolbar (`search`, `status`), table view, and actions (Create, Edit, Questions, Delete). |  |  |
| TASK-017 | Create `frontend/src/components/features/quizzes/AdminQuizForm.tsx` reusable form for create/update pages using `Input`, `Textarea`, `Select`, and `Switch` controls for quiz metadata fields. |  |  |
| TASK-018 | Create `frontend/src/components/features/quizzes/AdminQuizCreatePageClient.tsx` and wire `submitCreate`; on success redirect to `/{locale}/admin/quizzes/{id}`. |  |  |
| TASK-019 | Create `frontend/src/components/features/quizzes/AdminQuizEditorPageClient.tsx` and wire `loadDetail` + `submitUpdate`; include deterministic link button to `/{locale}/admin/quizzes/{id}/questions`. |  |  |
| TASK-020 | Create `frontend/src/components/features/quizzes/AdminQuizQuestionsPageClient.tsx` with ordered table and drag-handle reorder UI (library-free pointer reorder or keyboard move controls), plus add/edit/delete actions. |  |  |
| TASK-021 | Create `frontend/src/components/features/quizzes/AdminQuizQuestionFormDialog.tsx` supporting unions for `single_choice`, `multi_choice`, and `fill_blank` payloads and validating client-side constraints before submit. |  |  |
| TASK-022 | Create `frontend/src/components/features/quizzes/AdminQuizQuestionPreviewCard.tsx` and reuse `QuizQuestionView` display contract for preview mode. |  |  |

### Implementation Phase 5

- GOAL-005: Synchronize i18n, MSW contracts, and permission fixtures for admin quiz flows. Completion criteria: MSW mode supports full CRUD flows and all new UI strings resolve in both locales.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Update `frontend/src/mocks/data/fixtures.ts` to ensure mutable quiz/question fixtures include fields required by admin forms (`status`, `position`, `options[].is_correct`, `answers[]`). |  |  |
| TASK-024 | Refactor `frontend/src/mocks/handlers/quizzes.handlers.ts` to handle nested admin question routes (`/api/quiz/quizzes/:id/questions/` and `/api/quiz/quizzes/:id/questions/:qid/`) with full create/update/delete behavior. |  |  |
| TASK-025 | In `frontend/src/mocks/handlers/admin-permissions.ts`, add permission fixtures for quiz admin actions: `api.quiz.create`, `api.quiz.partial_update`, `api.quiz.destroy`, `api.quiz.questions`, `api.quiz.question_detail`. |  |  |
| TASK-026 | In `frontend/messages/en.json`, add `adminQuizzes.*` namespace and add `admin.quizzes` label used by admin shell navigation. |  |  |
| TASK-027 | Mirror exact `adminQuizzes.*` and `admin.quizzes` key structure into `frontend/messages/vi.json`. |  |  |

### Implementation Phase 6

- GOAL-006: Validate implementation and complete required process updates. Completion criteria: quality gates pass, manual smoke checks pass, and completion docs are updated in the same session.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Extend `frontend/playwright.integration.test.ts` (or add dedicated admin quiz spec) to cover list render, create quiz, edit quiz metadata, create question, update question, delete question, and reorder question positions. |  |  |
| TASK-029 | Run frontend quality gates in `frontend`: `npm run lint`, `npx tsc --noEmit`, `npm run build`; record outcomes in session report. |  |  |
| TASK-030 | Manual smoke in MSW mode for `/vi/admin/quizzes`, `/vi/admin/quizzes/new`, `/vi/admin/quizzes/{id}`, `/vi/admin/quizzes/{id}/questions` and same paths for `/en`. |  |  |
| TASK-031 | After implementation completion, update `docs/FE_PAGE_INVENTORY.md` (Task 7.7 status), `docs/STATUS.md` (completed entry), and create required report file in `docs/reports/`. |  |  |

## 3. Alternatives

- **ALT-001**: Implement quiz editor under user surface (`/{locale}/quizzes/*`) and guard by role checks. Rejected because architecture requires route-level admin surface separation.
- **ALT-002**: Create separate routes for category/tag management. Rejected by Task 7.7 requirement that category/tag operations remain inline.
- **ALT-003**: Keep using legacy flat endpoints (`/api/quiz-questions/*`) for question CRUD. Rejected because canonical API contract is namespaced under `/api/quiz/quizzes/*`.
- **ALT-004**: Use third-party drag-and-drop library for reorder in first iteration. Rejected to keep scope deterministic and dependency-free for MVP task delivery.

## 4. Dependencies

- **DEP-001**: `docs/IMPL_PLAN.md` Slice 7 Task 7.7 scope and file contract.
- **DEP-002**: `docs/prd/05-quiz.md` FR-QUIZ-01 and FR-QUIZ-03 for metadata/question rules.
- **DEP-003**: `backend/api/views/quizzes.py` actions `questions` and `question_detail` for nested CRUD semantics.
- **DEP-004**: `backend/api/serializers.py` class `QuizQuestionManageSerializer` validation rules for question payloads.
- **DEP-005**: `docs/FE_CONVENTIONS.md` service-layer, i18n parity, and shadcn component constraints.
- **DEP-006**: `frontend/src/lib/axios.ts` for auth header and refresh behavior on admin API calls.
- **DEP-007**: `frontend/src/mocks/handlers/index.ts` registration order consistency.
- **DEP-008**: Existing quiz member components (`QuizQuestionView.tsx`) for preview rendering reuse.

## 5. Files

- **FILE-001**: `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/page.tsx` - server route entry for admin quiz list.
- **FILE-002**: `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/new/page.tsx` - server route entry for create page.
- **FILE-003**: `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/[id]/page.tsx` - server route entry for metadata editor.
- **FILE-004**: `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/[id]/questions/page.tsx` - server route entry for question manager.
- **FILE-005**: `frontend/src/components/features/quizzes/AdminQuizListPageClient.tsx` - list/table UX and row actions.
- **FILE-006**: `frontend/src/components/features/quizzes/AdminQuizForm.tsx` - reusable metadata form for create/edit.
- **FILE-007**: `frontend/src/components/features/quizzes/AdminQuizCreatePageClient.tsx` - create flow container.
- **FILE-008**: `frontend/src/components/features/quizzes/AdminQuizEditorPageClient.tsx` - metadata edit container.
- **FILE-009**: `frontend/src/components/features/quizzes/AdminQuizQuestionsPageClient.tsx` - question management container.
- **FILE-010**: `frontend/src/components/features/quizzes/AdminQuizQuestionFormDialog.tsx` - question add/edit modal.
- **FILE-011**: `frontend/src/components/features/quizzes/AdminQuizQuestionPreviewCard.tsx` - member-like preview panel.
- **FILE-012**: `frontend/src/hooks/useAdminQuizzes.ts` - quiz list/detail/mutation orchestration.
- **FILE-013**: `frontend/src/hooks/useAdminQuizQuestions.ts` - question CRUD + reorder orchestration.
- **FILE-014**: `frontend/src/services/quizzes.service.ts` - canonical admin quiz service methods.
- **FILE-015**: `frontend/src/types/quiz.types.ts` - admin payload and response contracts.
- **FILE-016**: `frontend/src/lib/quiz-admin-error-map.ts` - API error to i18n key mapping.
- **FILE-017**: `frontend/src/components/layouts/AdminLayout.tsx` - add quizzes link to admin shell.
- **FILE-018**: `frontend/app/[locale]/(admin)/admin/(protected)/layout.tsx` - pass `quizzesLabel` translation prop.
- **FILE-019**: `frontend/src/mocks/data/fixtures.ts` - quiz/question fixture updates.
- **FILE-020**: `frontend/src/mocks/handlers/quizzes.handlers.ts` - nested route mock behavior.
- **FILE-021**: `frontend/src/mocks/handlers/admin-permissions.ts` - add quiz permission fixtures.
- **FILE-022**: `frontend/messages/en.json` - English admin quiz i18n keys.
- **FILE-023**: `frontend/messages/vi.json` - Vietnamese admin quiz i18n keys.
- **FILE-024**: `frontend/playwright.integration.test.ts` (or new admin quiz spec) - integration tests.
- **FILE-025**: `docs/FE_PAGE_INVENTORY.md` - mark Task 7.7 pages implemented after completion.
- **FILE-026**: `docs/STATUS.md` - add Slice 7 Task 7.7 completed summary after completion.
- **FILE-027**: `docs/reports/YYYY-MM-DD_slice7-task7-7-frontend-quiz-editor.md` - required completion report.

## 6. Testing

- **TEST-001**: Route test: admin-authenticated user can open `/{locale}/admin/quizzes` and see table columns with at least one row from MSW fixtures.
- **TEST-002**: Create test: submit valid metadata in create form, verify POST payload fields and redirect to editor page.
- **TEST-003**: Update test: modify status and point fields in editor page, verify PATCH call and success feedback.
- **TEST-004**: Delete test: delete quiz from list with confirmation dialog and verify row removal after reload.
- **TEST-005**: Question create single-choice test: enforce exactly one correct option; invalid state blocks submit.
- **TEST-006**: Question create multi-choice test: enforce at least one correct option; valid payload persists and appears in list.
- **TEST-007**: Question create fill-blank test: enforce non-empty answers list; saved question renders in preview.
- **TEST-008**: Question update test: edit explanation and case_sensitive, submit, and verify refreshed row values.
- **TEST-009**: Question delete test: remove question and verify list count and positions refresh.
- **TEST-010**: Reorder test: move question position and verify persisted `position` values after reload.
- **TEST-011**: i18n parity test: `adminQuizzes.*` key paths exist in both locale files with same structure.
- **TEST-012**: Admin shell nav test: `admin.quizzes` link appears in sidebar/top nav and routes correctly.
- **TEST-013**: Run `npm run lint` in `frontend` with zero new lint errors.
- **TEST-014**: Run `npx tsc --noEmit` in `frontend` with zero type errors.
- **TEST-015**: Run `npm run build` in `frontend` and verify production build includes Task 7.7 routes.

## 7. Risks & Assumptions

- **RISK-001**: Backend quiz list/detail serializers currently expose partial metadata fields; missing category/tag write fields can limit full parity with PRD editor requirements.
- **RISK-002**: Nested question list endpoint may return non-paginated arrays while service expects mixed shapes; missing normalization would cause runtime errors.
- **RISK-003**: Reorder logic based on sequential PATCH/PUT calls can leave partial order updates if one request fails mid-batch.
- **RISK-004**: Permission fixture drift in MSW can hide auth-related regressions for editor/admin action visibility.
- **RISK-005**: Large i18n namespace additions can introduce key mismatch between `en` and `vi` if not validated systematically.
- **ASSUMPTION-001**: Canonical nested question endpoints in `backend/api/urls.py` remain stable during Task 7.7 implementation.
- **ASSUMPTION-002**: `AdminAccessGate` remains auth-only gate for this phase; fine-grained RBAC UI hiding is optional and non-blocking for Task 7.7 functional delivery.
- **ASSUMPTION-003**: Existing Axios refresh flow in `frontend/src/lib/axios.ts` is sufficient for all admin quiz API calls.
- **ASSUMPTION-004**: Category/tag inline management in Task 7.7 can be limited to available API fields in current backend contract without adding new backend endpoints.

## 8. Related Specifications / Further Reading

docs/IMPL_PLAN.md
docs/prd/05-quiz.md
docs/API.md
docs/FE_CONVENTIONS.md
docs/FE_PAGE_INVENTORY.md
docs/RELEASE_CHECKLIST_SLICE5_8.md
docs/STATUS.md
docs/DECISIONS.md
CLAUDE.md
AGENT.md