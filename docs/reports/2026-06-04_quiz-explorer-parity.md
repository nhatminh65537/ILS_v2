# Session Report: Quiz → Challenge-style file-explorer + tags/categories + matching catalog

**Date:** 2026-06-04
**Slices / Areas:** Slice 7 (Quiz) — admin management, taxonomy, user catalog

## Summary

Brought the Quiz feature to parity with Challenge as the docs require (PRD FR-QUIZ-02 "giống challenge tree pattern", FR-QUIZ-08 category/tag, REQUIREMENTS §Quiz "tương tự challenge"). The quiz admin was a flat table with no tree, the `QuizNode` API rejected item nodes ("folder-only MVP"), there was no category/tag UI or endpoints, the editor split metadata/questions across two routes, and the user catalog was a flat card grid. This session replaced all of that: a global file-explorer (rendered as a **table** per the user's request, folders-first rows, drill-into-folder via `?folder=`), atomic quiz-item creation, category+tag CRUD and assignment, a single-page editor with **Metadata | Questions tabs**, and a user catalog identical to challenge (dual-mode explorer/flat-search + sidebar filter). Quiz items keep numeric `id` (no new slug column / no migration).

## Completed Items

- BE: `QuizService` tree/explorer/taxonomy/flat-search ops (mirror `ChallengeService`).
- BE: `QuizNodeWriteSerializer`, `QuizExplorerSerializer`; `category_id`/`tag_ids` writes + `category_name`/`is_solved` on list; unique-name validation on category/tag serializers.
- BE: `QuizCategoryViewSet`/`QuizTagViewSet`; rewritten `QuizNodeViewSet` (atomic create, bulk move, explorer root/folder); flat-search + pagination + `solved_ids` on quiz list.
- BE: URLs for `quiz/categories`, `quiz/tags`, `quiz/nodes/explorer`, `quiz/nodes/{id}/explorer`; seeded `quiz.max_tree_depth`.
- BE: 8 new pytest cases (atomic item create, explorer folder-first, member visibility, breadcrumb, taxonomy CRUD, category/tag assignment, tag flat-search).
- FE: types, service functions, `useAdminQuizExplorer` hook, taxonomy CRUD added to `useAdminQuizzes`, relative-key error map fix.
- FE: `AdminQuizExplorerClient` (table) + create/move dialogs + page; editor Tabs (`AdminQuizForm` with category/tag + `AdminQuizQuestionsTab` inline); taxonomy pages; rewritten user catalog + filter panel + breadcrumb + folder card.
- FE: removed dead routes (`/admin/quizzes/new`, `/admin/quizzes/[id]/questions`) and components.
- Mocks (explorer/node/taxonomy/flat-search) + i18n EN/VI parity.
- Docs: API.md, STATUS.md.

## Key Implementations

### Atomic quiz-item node creation (no slug)

1. `POST /api/quiz/nodes/` with `is_item=true` → `QuizService.create_quiz_node_atomic`.
2. In one transaction: create a draft `Quiz` (`status=DRAFT`, `quiz_point=0`, `total_questions=0`) then a `QuizNode(quiz=…, is_item=True, path=…)`.
3. Response serializer returns the node with `quiz` = the new quiz id; the FE explorer navigates to `/admin/quizzes/{id}` (numeric id, unlike challenge's slug).

### Explorer endpoints

1. `explorer_root` (detail=False) / `explorer_folder` (detail=True) call `_explorer_response`.
2. `list_explorer_children` returns folders-first (`order_by('is_item', Lower('title'), 'id')`); item nodes hidden unless the quiz status is in the user's allowed set (members → published only).
3. `solved_quiz_ids` is computed once and injected so each item summary carries `is_solved` without N+1.
4. `build_breadcrumb` walks the materialized `path` ancestor ids and appends the folder itself.

### Bulk move (no N+1)

1. `move_quiz_node_bulk` validates parent-is-folder, self/cycle (path prefix + parent-chain walk), and max depth for every descendant after the depth delta.
2. Updates the moved node, then rewrites every descendant `path` by string-replacing the old prefix and issues a single `bulk_update` — mirrors the challenge implementation, replacing the old per-node `move_to`.

### Editor Tabs

1. `AdminQuizEditorPageClient` loads detail + taxonomies, renders shadcn `Tabs`.
2. "Metadata" tab = `AdminQuizForm` (now with category `Select` + tag checkboxes, submitting `category_id`/`tag_ids`).
3. "Questions" tab = `AdminQuizQuestionsTab` (the former questions-page body, extracted; keeps `useAdminQuizQuestions`, dialogs, preview). The separate `/questions` route is deleted.

### User catalog dual-mode

1. Explorer mode loads `listQuizFolderContents(folderId)` and renders folder cards + published quiz cards with breadcrumb (URL-driven via `?folder=`).
2. Applying any filter (search/category/tag/solved) switches to flat-search mode: `listQuizzes({...})` with comma-joined `tags` (AND), paginated 12/page. Reset returns to explorer mode. Identical behavior to `/challenges`.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/quiz_service.py` | Added tree/explorer/taxonomy/flat-search ops |
| `backend/api/serializers/quiz.py` | Node-write + explorer serializers; category/tag writes; unique-name validation |
| `backend/api/serializers/__init__.py` | Export new quiz serializers |
| `backend/api/views/quizzes.py` | Taxonomy viewsets; rewritten `QuizNodeViewSet`; flat-search list |
| `backend/api/views/__init__.py` | Export `QuizCategoryViewSet`/`QuizTagViewSet` |
| `backend/api/urls.py` | quiz categories/tags/explorer routes |
| `backend/api/management/commands/seed_config.py` | `quiz.max_tree_depth` |
| `backend/api/tests/test_quiz_api.py` | New contract (`parent_id`) + 8 new tests |
| `frontend/src/types/quiz.types.ts` | Explorer/node/taxonomy types + payloads |
| `frontend/src/services/quizzes.service.ts` | node/explorer/taxonomy/flat-list functions |
| `frontend/src/lib/quiz-admin-error-map.ts` | Relative keys + cycle case |
| `frontend/src/hooks/useAdminQuizExplorer.ts` | New explorer hook |
| `frontend/src/hooks/useAdminQuizzes.ts` | Taxonomy state + CRUD; relative error keys |
| `frontend/src/hooks/useAdminQuizQuestions.ts` | Relative error keys |
| `frontend/src/components/features/quizzes/admin/*` | Explorer table, create/move dialogs, questions tab, taxonomy client |
| `frontend/src/components/features/quizzes/{AdminQuizForm,AdminQuizEditorPageClient,QuizCatalogClient,QuizFilterPanel,QuizCard? ,QuizBreadcrumb,QuizFolderCard}.tsx` | Category/tags form, Tabs editor, dual-mode catalog, new filter panel + breadcrumb + folder card |
| `frontend/app/[locale]/(admin)/admin/(protected)/quizzes/*` | Explorer page; taxonomy pages; removed `new` + `[id]/questions` |
| `frontend/src/mocks/{handlers/quizzes.handlers.ts,data/fixtures.ts}` | Explorer/node/taxonomy mocks + fixtures |
| `frontend/messages/{en,vi}.json` | New `adminQuizzes.*` + `quizzes.*` keys |
| `docs/API.md`, `docs/STATUS.md` | Quiz endpoint + status updates |

## Notes / Caveats

- **No slug column** added to `Quiz` (per decision); item routes use numeric `id`.
- **Manual reorder intentionally omitted** (quizzes are independent like CTF challenges); siblings are folder-first then title A→Z.
- Time-limit filter was dropped from the user catalog to match challenge filters (replaced by category/tag/solved); the BE still stores `time_limit_sec` and the card shows it.
- Pre-existing eslint errors in `frontend/src/components/features/courses/LessonViewerClient.tsx` are unrelated to this work.
- Full backend suite not run this session (time); `manage.py check` + `test_quiz_api.py` (25 passed) are green. FE has no unit-test runner configured; `tsc --noEmit` and `eslint` on quiz files pass clean.
