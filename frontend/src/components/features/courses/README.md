Course feature components for Slice 5 catalog + lazy tree flow.

Current components:
- `CourseCatalogClient.tsx` — catalog page orchestration
- `CourseFilterPanel.tsx` — local filter controls (search/status/category/tag)
- `CourseCard.tsx` — catalog card item
- `CourseDetailClient.tsx` — course detail orchestration (metadata + progress + tree)
- `CourseTreePanel.tsx` — root-level tree container
- `CourseTreeNodeItem.tsx` — recursive lazy tree node renderer

Data flow:
- State: `src/stores/courses.store.ts`
- Hook: `src/hooks/useCourses.ts`
- API: `src/services/courses.service.ts`