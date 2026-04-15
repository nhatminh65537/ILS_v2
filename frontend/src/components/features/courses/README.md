Course feature components for Slice 5 catalog + lazy tree flow.

Current components:
- `CourseCatalogClient.tsx` — catalog page orchestration
- `CourseFilterPanel.tsx` — local filter controls (search/status/category/tag)
- `CourseCard.tsx` — catalog card item
- `CourseDetailClient.tsx` — course detail orchestration (metadata + progress + tree)
- `CourseTreePanel.tsx` — root-level tree container
- `CourseTreeNodeItem.tsx` — recursive lazy tree node renderer
- `LessonViewerClient.tsx` — lesson viewer orchestration
- `LessonCourseTreeSidebar.tsx` — left lesson tree sidebar
- `LessonProgressSidebar.tsx` — right progress/actions/next-prev sidebar
- `LessonMarkdownContent.tsx` — markdown lesson renderer with guided scroll signal
- `LessonVideoContent.tsx` — video lesson renderer with guided watch signal
- `LessonMiniQuizContent.tsx` — inline miniquiz renderer with reveal flow

Data flow:
- State: `src/stores/courses.store.ts`
- Hook: `src/hooks/useCourses.ts`
- API: `src/services/courses.service.ts`
- API (lesson): `src/services/lessons.service.ts`