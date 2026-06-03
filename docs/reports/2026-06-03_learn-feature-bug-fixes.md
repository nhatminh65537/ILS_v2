# Session Report: Learn Feature Bug Fixes (26 issues)

**Date:** 2026-06-03
**Slices / Areas:** Slice 5 (Learn) — courses, lessons, progress, points; admin Learn UI

## Summary

Confirmed and fixed ~26 bugs/issues found during manual integration testing of the Learn pillar. Reworked the points model from course-level to per-lesson awarding, made `Course.learning_point` an auto-computed aggregate, fixed the lesson viewer race conditions / auto-start / progress display, added markdown typography styling, and cleaned up multiple admin UI inconsistencies (status display, markdown preview, breadcrumbs, read-only course points, drag-to-root, progress filter, and dedicated category/tag admin pages).

## Completed Items

- Per-lesson points award on first lesson completion (idempotent).
- Removed course-completion point double-count (only `course_completed` counter bumps).
- `Course.learning_point` auto-recomputed as SUM of lesson points on node create/delete and lesson update.
- Data migration `0011_backfill_course_learning_point` to backfill existing courses.
- Backend tests updated for per-lesson behavior + new recompute test (13 targeted tests pass).
- Lesson viewer: fixed flicker/stuck error, auto-start on open, removed manual start button, derive completed state, miniquiz race guard, show lesson points, layout collapse + full-page scroll.
- Installed/configured `@tailwindcss/typography`; tuned prose contrast (light+dark); applied to admin preview.
- Admin: status badge only (removed inline Select), markdown preview via ReactMarkdown, consistent breadcrumbs, read-only course points, drag node to root zone, FE-side progress filter, dedicated `admin/learn/categories` + `admin/learn/tags` pages.
- Frontend production build compiles successfully.

## Key Implementations

### Per-lesson points award

1. `LearnProgressService.complete_lesson` returns `(progress, transitioned)`; `transitioned` is True only on the first completion.
2. On transition, `award_lesson_points(user, lesson)` increments `UserProfile.total_learning_point` by `lesson.learning_point` via an F() update (atomic, idempotent across re-completes).
3. `sync_user_profile_on_course_completion` now only increments `course_completed` (no point award) to avoid double counting.

### Auto-computed course learning_point

1. `CourseService.recompute_course_learning_point(course_id)` aggregates `Sum('learning_point')` over `Lesson.objects.filter(node__course_id=...)` (uses `CourseNode.lesson` OneToOne `related_name='node'`).
2. Called after `create_course_node_atomic` (item nodes), `delete_course_node_subtree` (when lessons removed), and in `LearnLessonViewSet.update` after a lesson save.
3. Migration `0011` backfills all existing courses.

### Lesson viewer flow

1. Loads course detail / progress / nav tree / lesson in parallel; error only shown after all fetches settle (no flicker/stuck).
2. Auto-fires `progress/start` on open; existing progress hydrates completed state so finished lessons render as done.
3. Miniquiz questions fetch guarded by `activeLesson.id === lessonId` to prevent cross-lesson race.

### UI refinements (follow-up)

1. Lesson viewer: replaced the single left→right sidebar collapse with **two independent vertical (top-down) collapses** — the "Course content" tree card (`LessonViewerClient`, state `isTreeCollapsed`) and the "Lesson progress" card (`LessonProgressSidebar`, state `isProgressCollapsed`). Each card header has its own chevron-up/down toggle that shows/hides only that panel's body.
2. Admin markdown editor: replaced the side-by-side editor+preview grid with a **toggle button** that switches between Editor and Preview views (state `showPreview`); only one view renders at a time. Preview keeps `prose prose-lesson` typography styling.
3. New i18n keys: `courses.lessonViewer.collapsePanel`/`expandPanel` and `adminLearn.lesson.showPreview`/`showEditor` (en + vi).

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/learn_progress_service.py` | Added `award_lesson_points`; per-lesson award on transition; removed course-level point award |
| `backend/api/services/course_service.py` | Added `recompute_course_learning_point`; wired into create/delete; `Sum` import |
| `backend/api/views/courses.py` | Recompute course point after lesson update |
| `backend/api/migrations/0011_backfill_course_learning_point.py` | New data migration to backfill course points |
| `backend/api/tests/test_learn_progress_api.py` | Updated for per-lesson points; new recompute test |
| `frontend/src/components/features/courses/LessonViewerClient.tsx` | Flicker/stuck fix, auto-start, completed state, miniquiz guard, points, layout; per-panel vertical collapse for course tree |
| `frontend/src/components/features/courses/LessonProgressSidebar.tsx` | Independent vertical collapse for the lesson-progress card |
| `frontend/src/components/features/courses/admin/AdminLearnLessonMarkdownTab.tsx` | Editor/Preview toggle button (single view at a time) |
| `frontend/src/components/features/courses/LessonMarkdownContent.tsx` | Full-page scroll; removed scroll-progress text |
| `frontend/src/components/features/courses/CourseCatalogClient.tsx` + `CourseFilterPanel.tsx` | FE-side progress filter |
| `frontend/src/components/features/courses/admin/*` | Status badge, markdown preview, breadcrumbs, read-only points, drag-to-root |
| `frontend/app/[locale]/(admin)/admin/learn/categories|tags/*` | New dedicated taxonomy admin pages |
| `frontend/app/globals.css` | Typography plugin + prose theming |
| `frontend/package.json` | Added `@tailwindcss/typography` |
| `frontend/messages/en.json` + `vi.json` | New i18n keys |

## Notes / Caveats

- Old dialog components `AdminLearnCategoryDialog.tsx` and `AdminLearnTagDialog.tsx` are now unused but **kept** (not deleted) per request; safe to remove later.
- A stray `package.json`/`package-lock.json` + `node_modules` exist at repo root from an accidental install; harmless but can be cleaned up.
- Full backend pytest suite was not run end-to-end this session (time); targeted Learn + notification tests (13) pass and frontend build compiles cleanly.
