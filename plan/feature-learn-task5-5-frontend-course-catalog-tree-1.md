---
goal: Slice 5 Task 5.5 Frontend Course Catalog and Lazy Tree Delivery
version: 1
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Frontend Team
status: 'Planned'
tags: [feature, learn, frontend, catalog, tree, slice5]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic, machine-executable steps for Slice 5 Task 5.5 to implement the frontend course catalog and lazy-loaded course tree using canonical Learn API routes, existing frontend surface conventions, and the current App Router structure.

## 1. Requirements & Constraints

- **REQ-001**: Implement user-facing Task 5.5 pages at exact existing file locations:
  - `frontend/app/[locale]/(catalog)/courses/page.tsx`
  - `frontend/app/[locale]/(catalog)/courses/[slug]/page.tsx`
- **REQ-002**: Catalog page must render a two-column layout (left filter panel + right content grid) inside the page client component, not injected via layout props.
- **REQ-003**: Course detail page must load tree lazily:
  - root nodes from `GET /api/learn/courses/{slug}/nodes/`
  - folder expansion nodes from `GET /api/learn/courses/{slug}/nodes/{id}/children/`
- **REQ-004**: Course detail page must display progress via `GET /api/learn/courses/{slug}/progress/` and keep display resilient when progress payload is unavailable.
- **REQ-005**: Lesson item click must navigate to `/{locale}/courses/{slug}/lessons/{id}` without implementing lesson content rendering logic in Task 5.5.
- **REQ-006**: API integration must use canonical namespaced Learn endpoints only:
  - `/api/learn/courses/*`
  - `/api/learn/courses/{slug}/nodes/*`
  - `/api/learn/courses/{slug}/progress/`
  - `/api/learn/categories/*`
  - `/api/learn/tags/*`
- **REQ-007**: Components and hooks must not call Axios directly; all HTTP calls must go through `frontend/src/services/courses.service.ts`.
- **REQ-008**: User-facing text must be localized using `next-intl`; `frontend/messages/en.json` and `frontend/messages/vi.json` key trees must remain structurally identical.
- **REQ-009**: Existing skeleton pages in Task 5.5 paths must be replaced with server-component wrappers that pass `locale`/`slug` props to new client components.
- **REQ-010**: Existing frontend quiz catalog architecture is the required reference pattern for Task 5.5:
  - hook-driven state load (`frontend/src/hooks/useQuizzes.ts` pattern)
  - store selector usage (`frontend/src/stores/quizzes.store.ts` pattern)
  - catalog client structure (`frontend/src/components/features/quizzes/QuizCatalogClient.tsx` pattern)
- **SEC-001**: Frontend must not call Outline directly; only backend-mediated Learn endpoints are allowed.
- **SEC-002**: API error handling must preserve 401/403/404 semantics from backend without exposing hidden draft-course resources to member UI as detailed data.
- **API-001**: Service contracts must align exactly with current backend serializers in `backend/api/serializers/course.py`:
  - `LearnCourseListSerializer`
  - `LearnCourseDetailSerializer`
  - `LearnCourseNodeSerializer`
  - `LearnCourseProgressSerializer`
- **CON-001**: Follow `docs/FE_CONVENTIONS.md` route-group rule: catalog pages must remain in `(catalog)` group and not be moved to `(app)` group.
- **CON-002**: Resolve current planning-doc route conflict deterministically in this plan:
  - stale route text exists in `docs/IMPL_PLAN.md` and `docs/TEAM_PLAN.md` using `(app)/learn`
  - implemented frontend topology and `docs/FE_CONVENTIONS.md` use `(catalog)/courses`
  - this plan uses `(catalog)/courses` as canonical runtime path.
- **CON-003**: Keep compatibility for unfinished slices by retaining legacy course service exports only when still imported; remove dead legacy helpers only after reference search confirms no call sites.
- **GUD-001**: Run frontend quality gates before task sign-off:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
- **PAT-001**: Use one domain store + one domain hook pattern for courses (`courses.store.ts` + `useCourses.ts`) consistent with quizzes implementation.
- **PAT-002**: Use local page-state filters in catalog client (`useState` + `useMemo`) and avoid URL query-state coupling for MVP.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Align frontend Learn course types and service layer with canonical namespaced backend contracts.
- VAL-001: TypeScript types and service methods map 1:1 to `/api/learn/*` payloads and endpoints.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update `frontend/src/types/course.types.ts` to define canonical DTOs for namespaced Learn APIs: `LearnCourse`, `LearnCourseDetail`, `LearnCourseNode`, `LearnLessonSummary`, `LearnCourseProgress`, and `LearnCourseListResponse` (paginated-compatible). |  |  |
| TASK-002 | In `frontend/src/types/course.types.ts`, replace deprecated legacy fields (`course_id`, `node_type`, `percent_complete`) with serializer-aligned fields (`parent`, `is_item`, `has_children`, `lesson_count`, `completed`, `percent`). |  |  |
| TASK-003 | Refactor `frontend/src/services/courses.service.ts` to canonical methods using slug-based/namespaced routes: `listLearnCourses`, `getLearnCourseBySlug`, `getLearnCourseProgress`, `listLearnRootNodes`, `listLearnNodeChildren`, `listLearnCategories`, `listLearnTags`. |  |  |
| TASK-004 | In `frontend/src/services/courses.service.ts`, add list normalization utility (same pattern as `quizzes.service.ts`) to support both paginated and array responses for mock/runtime parity. |  |  |
| TASK-005 | Keep or remove legacy `/api/courses/*` helper exports in `frontend/src/services/courses.service.ts` only after workspace reference check confirms no active imports. |  |  |
| TASK-006 | Update service documentation text in `frontend/src/services/README.md` so courses service description explicitly states namespaced Learn routes (`/api/learn/*`). |  |  |

### Implementation Phase 2

- GOAL-002: Build deterministic courses domain state and data-loading hook.
- VAL-002: `useCourses` can load catalog, detail, progress, root nodes, and lazy children with explicit loading/error states.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Refactor `frontend/src/stores/courses.store.ts` state shape to include: `courses`, `selectedCourse`, `courseProgress`, `rootNodes`, `childrenByParentId`, `expandedNodeIds`, `isCatalogLoading`, `isDetailLoading`, `isTreeLoadingByNodeId`, `error`. |  |  |
| TASK-008 | In `frontend/src/stores/courses.store.ts`, add deterministic actions: `setCourses`, `setSelectedCourse`, `setCourseProgress`, `setRootNodes`, `mergeChildren`, `toggleNodeExpanded`, `setTreeNodeLoading`, `setCatalogLoading`, `setDetailLoading`, `setError`, `reset`. |  |  |
| TASK-009 | Create `frontend/src/hooks/useCourses.ts` with hook selectors and async actions: `loadCourses`, `loadCourseDetail`, `loadCourseProgress`, `loadRootNodes`, `loadNodeChildren`, `expandNode`, `collapseNode`, `reset`. |  |  |
| TASK-010 | Implement `expandNode` in `frontend/src/hooks/useCourses.ts` to call `loadNodeChildren` only when node is folder, expanded state is changing to true, and children are not already cached. |  |  |
| TASK-011 | In `frontend/src/hooks/useCourses.ts`, use stable error keys under `courses.errors.*` for i18n-safe UI rendering. |  |  |

### Implementation Phase 3

- GOAL-003: Deliver course catalog UI client with filter panel and cards grid.
- VAL-003: Catalog route renders data-driven cards, local filters, and fallback states using `useCourses`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `frontend/src/components/features/courses/CourseCatalogClient.tsx` as the main Task 5.5 catalog client component receiving prop `{ locale: string }`. |  |  |
| TASK-013 | In `CourseCatalogClient.tsx`, implement mount-time `loadCourses` call and local filter state (`search`, `selectedCategories`, `selectedTags`, `statusFilter`) using `useState`. |  |  |
| TASK-014 | In `CourseCatalogClient.tsx`, derive `availableCategories` and `availableTags` from loaded catalog data via `useMemo` (no extra filter API request for MVP). |  |  |
| TASK-015 | Create `frontend/src/components/features/courses/CourseFilterPanel.tsx` with controlled props for filter values and callbacks; include reset action that returns to deterministic initial state. |  |  |
| TASK-016 | Create `frontend/src/components/features/courses/CourseCard.tsx` rendering title, description, status badge, category/tags summary, progress (`completed/total`), and detail link to `/${locale}/courses/${slug}`. |  |  |
| TASK-017 | In `CourseCatalogClient.tsx`, render loading (`Skeleton`), empty (`no courses` / `no filter results`), and error states with `courses.errors.*` message keys. |  |  |
| TASK-018 | Update `frontend/src/components/features/courses/README.md` to list the new catalog components and their responsibility boundaries. |  |  |

### Implementation Phase 4

- GOAL-004: Deliver course detail UI client with lazy-loaded tree interactions.
- VAL-004: Course detail route loads course metadata + progress + root nodes, and folder expansion lazily fetches children endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Create `frontend/src/components/features/courses/CourseDetailClient.tsx` receiving props `{ locale: string; slug: string }`. |  |  |
| TASK-020 | In `CourseDetailClient.tsx`, on initial mount call `loadCourseDetail(slug)`, `loadCourseProgress(slug)`, and `loadRootNodes(slug)` with deterministic request sequence and error handling. |  |  |
| TASK-021 | Create `frontend/src/components/features/courses/CourseTreePanel.tsx` to render root nodes and recursive node items from store state (`rootNodes` + `childrenByParentId`). |  |  |
| TASK-022 | Create `frontend/src/components/features/courses/CourseTreeNodeItem.tsx` that supports folder expand/collapse, per-node loading spinner, and lazy-children fetch trigger via `expandNode(slug, nodeId)`. |  |  |
| TASK-023 | In `CourseTreeNodeItem.tsx`, for lesson-item nodes (`is_item=true`), render deterministic lesson link `/${locale}/courses/${slug}/lessons/${lesson.id}`. |  |  |
| TASK-024 | In `CourseDetailClient.tsx`, add top-level summary panel showing status/category/tag metadata from `selectedCourse` and progress card from `courseProgress`. |  |  |
| TASK-025 | In `CourseDetailClient.tsx`, add `Back to courses` navigation link to `/${locale}/courses` with i18n key `courses.detail.backToCatalog`. |  |  |

### Implementation Phase 5

- GOAL-005: Replace Task 5.5 skeleton route files with server wrappers that delegate to client feature components.
- VAL-005: Route files under `(catalog)/courses` are thin wrappers and contain no duplicated business logic.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Replace content of `frontend/app/[locale]/(catalog)/courses/page.tsx` to render `<CourseCatalogClient locale={locale} />` with locale extraction from `params`. |  |  |
| TASK-027 | Replace content of `frontend/app/[locale]/(catalog)/courses/[slug]/page.tsx` to render `<CourseDetailClient locale={locale} slug={slug} />`. |  |  |
| TASK-028 | Keep `frontend/app/[locale]/(catalog)/courses/[slug]/lessons/[id]/page.tsx` unchanged for Task 5.6; do not introduce lesson rendering in Task 5.5 scope. |  |  |

### Implementation Phase 6

- GOAL-006: Align MSW Learn course handlers and fixture data to namespaced API contract used by Task 5.5 UI.
- VAL-006: In MSW mode, Task 5.5 pages operate entirely through `/api/learn/*` handlers with backend-compatible payload shape.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-029 | Update course fixture models in `frontend/src/mocks/data/fixtures.ts` to include serializer-aligned fields for `category` object, `tags`, node `parent/is_item/has_children`, and progress `{lesson_count, completed, percent}`. |  |  |
| TASK-030 | Refactor `frontend/src/mocks/handlers/courses.handlers.ts` list/detail endpoints to canonical namespaced paths: `GET /api/learn/courses/`, `GET /api/learn/courses/:slug/`. |  |  |
| TASK-031 | Add namespaced progress handler in `courses.handlers.ts`: `GET /api/learn/courses/:slug/progress/` returning `LearnCourseProgressSerializer` shape. |  |  |
| TASK-032 | Add namespaced tree handlers in `courses.handlers.ts`: `GET /api/learn/courses/:slug/nodes/` and `GET /api/learn/courses/:slug/nodes/:id/children/` with deterministic lazy child responses. |  |  |
| TASK-033 | Add/align category and tag handlers in `courses.handlers.ts`: `GET /api/learn/categories/` and `GET /api/learn/tags/` for filter option hydration if Task 5.5 chooses API-fed filters. |  |  |
| TASK-034 | Keep legacy mock handlers (`/api/courses/*`) only when required by unresolved pages; otherwise remove to avoid contract drift in future tasks. |  |  |

### Implementation Phase 7

- GOAL-007: Complete localization, quality validation, and documentation normalization for Task 5.5 sign-off.
- VAL-007: Frontend builds cleanly, routes work in dev/MSW, and planning docs no longer conflict on route path.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-035 | Extend course translation namespaces in `frontend/messages/en.json` and `frontend/messages/vi.json` with catalog/detail/filter/error keys required by new components; keep key trees identical across locales. |  |  |
| TASK-036 | Run validation commands in `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run build`; resolve all Task 5.5-introduced errors. |  |  |
| TASK-037 | Manual smoke validation in browser with MSW enabled: `/{locale}/courses` renders cards/filter; `/{locale}/courses/{slug}` renders lazy tree/progress; lesson node links navigate to `/{locale}/courses/{slug}/lessons/{id}`. |  |  |
| TASK-038 | Normalize route conflict docs in same session: update Task 5.5 route references from `(app)/learn` to `(catalog)/courses` in `docs/IMPL_PLAN.md` and `docs/TEAM_PLAN.md`. |  |  |
| TASK-039 | Update `docs/STATUS.md` after implementation verification to mark "Frontend: Course catalog + tree" as completed with task evidence. |  |  |
| TASK-040 | Create mandatory session report in `docs/reports/YYYY-MM-DD_slice5-task5-5-frontend-course-catalog-tree.md` and update `openmemory.md` with new frontend learn pattern entries. |  |  |

## 3. Alternatives

- **ALT-001**: Implement Task 5.5 under `frontend/app/[locale]/(app)/learn/*` exactly as stale IMPL text. Rejected because it conflicts with active frontend route-group architecture and existing navigation links pointing to `/{locale}/courses`.
- **ALT-002**: Fetch entire tree recursively in one request and render pre-expanded structure. Rejected because backend contract and architecture explicitly define lazy children loading endpoints.
- **ALT-003**: Keep using legacy frontend service routes (`/api/courses/*`) and postpone migration. Rejected because release gate requires namespaced APIs for new work and this would create additional contract drift.
- **ALT-004**: Inject filter sidebar from layout level for reusability. Rejected because App Router layout boundaries complicate params-dependent filter data; FE conventions require page-client-owned filter panel.

## 4. Dependencies

- **DEP-001**: Backend Learn API endpoints in `backend/api/urls.py` and implementations in `backend/api/views/courses.py`.
- **DEP-002**: Backend Learn serializers in `backend/api/serializers/course.py` (course list/detail/node/progress contracts).
- **DEP-003**: Frontend architecture constraints in `docs/FE_CONVENTIONS.md` (catalog route group and two-column filter pattern).
- **DEP-004**: Route inventory in `docs/FE_PAGE_INVENTORY.md` (Task 5.5 skeleton files and placement).
- **DEP-005**: Slice planning/contracts in `docs/IMPL_PLAN.md`, `docs/API.md`, and `docs/prd/03-learn.md`.
- **DEP-006**: Shared frontend infrastructure: `frontend/src/lib/axios.ts`, `frontend/src/components/ui/*`, `next-intl` locale dictionaries.
- **DEP-007**: Existing catalog implementation pattern from quizzes domain (`useQuizzes`, `quizzes.store`, `QuizCatalogClient`, `QuizDetailClient`).

## 5. Files

- **FILE-001**: `frontend/src/types/course.types.ts` - canonical Learn DTO alignment.
- **FILE-002**: `frontend/src/services/courses.service.ts` - namespaced Learn API methods.
- **FILE-003**: `frontend/src/services/README.md` - service contract description update.
- **FILE-004**: `frontend/src/stores/courses.store.ts` - courses domain store refactor.
- **FILE-005**: `frontend/src/hooks/useCourses.ts` - new courses data hook.
- **FILE-006**: `frontend/src/components/features/courses/CourseCatalogClient.tsx` - catalog page client.
- **FILE-007**: `frontend/src/components/features/courses/CourseFilterPanel.tsx` - catalog filters.
- **FILE-008**: `frontend/src/components/features/courses/CourseCard.tsx` - catalog card component.
- **FILE-009**: `frontend/src/components/features/courses/CourseDetailClient.tsx` - course detail client.
- **FILE-010**: `frontend/src/components/features/courses/CourseTreePanel.tsx` - lazy tree container.
- **FILE-011**: `frontend/src/components/features/courses/CourseTreeNodeItem.tsx` - recursive node renderer.
- **FILE-012**: `frontend/src/components/features/courses/README.md` - feature component inventory update.
- **FILE-013**: `frontend/app/[locale]/(catalog)/courses/page.tsx` - server wrapper for catalog client.
- **FILE-014**: `frontend/app/[locale]/(catalog)/courses/[slug]/page.tsx` - server wrapper for detail client.
- **FILE-015**: `frontend/messages/en.json` - English i18n keys for courses catalog/detail/tree.
- **FILE-016**: `frontend/messages/vi.json` - Vietnamese i18n keys for courses catalog/detail/tree.
- **FILE-017**: `frontend/src/mocks/data/fixtures.ts` - Learn fixture contract alignment.
- **FILE-018**: `frontend/src/mocks/handlers/courses.handlers.ts` - namespaced Learn handlers.
- **FILE-019**: `docs/IMPL_PLAN.md` - route normalization for Task 5.5 path.
- **FILE-020**: `docs/TEAM_PLAN.md` - route normalization for Task 5.5 path.
- **FILE-021**: `docs/STATUS.md` - completion tracking update after validation.
- **FILE-022**: `docs/reports/YYYY-MM-DD_slice5-task5-5-frontend-course-catalog-tree.md` - mandatory completion report.
- **FILE-023**: `openmemory.md` - session pattern/status memory update.

## 6. Testing

- **TEST-001**: Catalog load test: `/{locale}/courses` renders published courses and no runtime crash when API returns paginated results.
- **TEST-002**: Catalog filter test: search/category/tag/status filters update visible cards deterministically without route reload.
- **TEST-003**: Detail load test: `/{locale}/courses/{slug}` renders course metadata and progress payload (`lesson_count`, `completed`, `percent`).
- **TEST-004**: Lazy tree test: expanding a folder sends exactly one children request per folder until cache invalidation.
- **TEST-005**: Lesson navigation test: clicking lesson node links to `/{locale}/courses/{slug}/lessons/{id}`.
- **TEST-006**: Error-state test: 404 course detail shows localized not-found/error fallback instead of blank page.
- **TEST-007**: Locale parity test: same key paths exist in `en.json` and `vi.json` for all new `courses.*` keys.
- **TEST-008**: Command gate: `npm run lint` passes.
- **TEST-009**: Command gate: `npx tsc --noEmit` passes.
- **TEST-010**: Command gate: `npm run build` passes.

## 7. Risks & Assumptions

- **RISK-001**: Planning-document route conflict (`(app)/learn` vs `(catalog)/courses`) can cause rework if not normalized before implementation merge.
- **RISK-002**: Existing frontend courses domain still uses legacy endpoints; partial migration can create mixed-contract regressions if legacy helpers remain accidentally used.
- **RISK-003**: Backend list payload currently marks Learn endpoints as `Partial`; unimplemented backend fields in future tasks may require frontend type extension.
- **RISK-004**: Tree rendering complexity may introduce repeated fetch loops if expanded-node caching is not implemented correctly.
- **ASSUMPTION-001**: Runtime canonical user-facing route for Task 5.5 is `/{locale}/courses` under `(catalog)` route group.
- **ASSUMPTION-002**: Backend Learn endpoints from Tasks 5.1-5.4 remain stable during Task 5.5 implementation.
- **ASSUMPTION-003**: Task 5.6 will own lesson-viewer content rendering; Task 5.5 only links to lesson route.

## 8. Related Specifications / Further Reading

[docs/IMPL_PLAN.md](../docs/IMPL_PLAN.md)
[docs/STATUS.md](../docs/STATUS.md)
[docs/API.md](../docs/API.md)
[docs/API_ROUTE_MAPPING.md](../docs/API_ROUTE_MAPPING.md)
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
[docs/DECISIONS.md](../docs/DECISIONS.md)
[docs/FE_CONVENTIONS.md](../docs/FE_CONVENTIONS.md)
[docs/FE_PAGE_INVENTORY.md](../docs/FE_PAGE_INVENTORY.md)
[docs/prd/03-learn.md](../docs/prd/03-learn.md)
[docs/TEAM_PLAN.md](../docs/TEAM_PLAN.md)
[docs/RELEASE_CHECKLIST_SLICE5_8.md](../docs/RELEASE_CHECKLIST_SLICE5_8.md)
[DEV_WORKFLOW.md](../DEV_WORKFLOW.md)
[CLAUDE.md](../CLAUDE.md)
