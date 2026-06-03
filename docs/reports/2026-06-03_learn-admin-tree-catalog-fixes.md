# Session Report: Learn Admin (Course/Lesson Tree) + User Catalog Filter Fixes

**Date:** 2026-06-03
**Slices / Areas:** Slice 5 (Learn) — admin course/lesson tree editor + member catalog filtering. Integration Test 1, nhóm D + các phát hiện phụ (_-01.._-13, D-04).

## Summary

Khắc phục toàn bộ các phát hiện manual khi test nhóm D của Integration Test 1: thay dialog mặc định của trình duyệt bằng dialog app, bổ sung xóa vĩnh viễn (purge) course bên cạnh archive, sửa bug cây thư mục rỗng sau khi tạo node trong folder đang mở, đồng bộ node title ↔ lesson title, thêm UI sửa metadata lesson + breadcrumb về cây edit, **thiết kế lại cây thư mục với drag-and-drop** (@dnd-kit) thay cơ chế reorder hỏng (gốc D-04), sort folder-first, dialog tạo node đầy đủ metadata + template markdown mặc định, và **lọc catalog phía user bằng backend filter + paging thật sự** (category + name + AND-tags + status, nút Lọc/Reset, render mượt không nháy). Toàn bộ 185 backend test pass (+9 test mới), frontend tsc/eslint sạch trên file thay đổi, smoke test Playwright xác nhận end-to-end.

## Completed Items

- [x] BE A1 — sort folder-first: `order_by('is_item','position','id')` cho node list/children.
- [x] BE A2 — endpoint `POST /api/learn/courses/{slug}/nodes/reorder/` + service `reorder_course_node_siblings` reindex `position=0..n` theo `ordered_ids`.
- [x] BE A2b — `create_course_node_atomic` tự gán position = max(sibling)+1 (bỏ nhập position tay).
- [x] BE A3 — rename node-item đồng bộ `lesson.title`.
- [x] BE A4 — catalog tag AND-filter (`?tags=`) + `LimitOffsetPagination`.
- [x] BE A5 — `LearnLessonDetailSerializer` thêm `course_slug`/`course_title`.
- [x] BE tests — +9 test (reorder reindex, mismatch reject, folder-first sort, default position, rename sync, tag AND-filter, limit/offset paging, course_slug).
- [x] FE B1 — `ConfirmDialog` dùng chung; thay 5 chỗ `window.confirm/prompt`.
- [x] FE B2 — `refreshTree` reload children mọi folder đang expand (fix folder rỗng _-03).
- [x] FE B3 — Archive + Xóa vĩnh viễn (purge) với `?mode=`.
- [x] FE B4 — redesign cây drag-drop (@dnd-kit) + `NodeCreateDialog` + `NodeRenameDialog` + hiển thị order/point/time + template MD mặc định.
- [x] FE B5 — tab Metadata cho lesson + breadcrumb về cây edit course.
- [x] FE B6 — catalog filter BE + paging + nút Lọc/Reset + render mượt.
- [x] i18n — bổ sung key vi.json + en.json (cả hai locale).
- [x] Verify — tsc/eslint sạch (file thay đổi), 185 BE test pass, Playwright smoke 10/10 check pass.

## Key Implementations

### Reorder cây bằng `ordered_ids` (gốc D-04)

1. `position` là IntegerField liên tục → patch 1 node không chèn-giữa được, set thẳng position sinh trùng → thứ tự loạn (nguyên nhân D-04).
2. FE drag-drop (@dnd-kit) tính **mảng thứ tự mới của sibling** (đã folder-first), gửi `{parent_id, ordered_ids}`.
3. BE `reorder_course_node_siblings`: validate `set(ordered_ids) == set(sibling_ids)` (không thiếu/thừa/lẫn parent khác); gán `position = index`; `bulk_update`; bump structure_version. Idempotent, không bao giờ trùng position.

### Drag-drop tree (FE)

1. `AdminLearnTreeTab` host 1 `DndContext`; mỗi nhóm sibling là 1 `SortableContext` (reorder scoped theo parent).
2. `buildIndex` dựng lookup node→parent + sibling-list từ root + children cache.
3. `onDragEnd`: nếu thả trên folder khác parent hiện tại → `submitMoveNode`; nếu thả trên sibling cùng parent → `arrayMove` + `submitReorderSiblings`.
4. `onDragOver` highlight folder đích chỉ khi thả thực sự gây move (khác parent hiện tại).

### Fix folder rỗng sau create (_-03)

1. Bug cũ: `refreshTree` chỉ xóa `childrenByParentId` nhưng giữ `expandedNodeIds` → folder vẫn "expand" nhưng cache rỗng, không reload.
2. Fix: `refreshTree` đọc `expandedNodeIds`, `Promise.all([loadRoot, ...loadChildren(mỗi id expand)])`, dựng lại `childrenByParentId` đầy đủ → node mới hiện ngay.

### Catalog backend filter + paging (_-13)

1. BE `filter_visible_learn_courses`: tag AND-filter chồng nhiều `.filter(tag_mappings__tag_id=id)` + `.distinct()`; giữ category/search/status; đổi sang `LimitOffsetPagination`.
2. FE `CourseCatalogClient`: filter state editable + `appliedRef` snapshot; chỉ gọi BE khi bấm **Lọc/Đặt lại/đổi trang**; giữ grid mounted + `opacity-60` overlay khi loading (không nháy); pagination prev/next; filter universe nạp từ taxonomy endpoints.

### Course delete = Archive + Purge (_-02)

1. BE `archive_or_purge_course(mode='purge')` đã có sẵn (check `material.purge`) — chỉ thiếu FE truyền `?mode=`.
2. FE: 2 action — "Lưu trữ" (archive, confirm thường) + "Xóa vĩnh viễn" (purge, ConfirmDialog destructive yêu cầu gõ đúng slug để confirm).

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/views/courses.py` | folder-first ordering; reorder action; rename sync lesson.title; `LimitOffsetPagination` |
| `backend/api/services/course_service.py` | `reorder_course_node_siblings`; tag AND-filter + `_parse_tag_ids`; default position max+1 |
| `backend/api/serializers/course.py` | `LearnCourseNodeReorderSerializer`; `course_slug`/`course_title` trên lesson detail |
| `backend/api/serializers/__init__.py` | export reorder serializer |
| `backend/api/urls.py` | route `nodes/reorder/` |
| `backend/api/tests/test_learn_course_node_api.py` | +6 test (sort, default position, reorder, rename sync) |
| `backend/api/tests/test_learn_course_api.py` | +2 test (tag AND-filter, limit/offset paging) |
| `backend/api/tests/test_learn_lesson_api.py` | course_slug assertion |
| `frontend/src/components/ui/confirm-dialog.tsx` | **new** — confirm dialog dùng chung (có requireText cho purge) |
| `frontend/src/components/features/courses/admin/AdminLearnTreeTab.tsx` | rewrite — DndContext + create dialog host |
| `frontend/src/components/features/courses/admin/AdminLearnNodeRow.tsx` | rewrite — sortable row + order/point/time + dialog rename/delete |
| `frontend/src/components/features/courses/admin/AdminLearnNodeTree.tsx` | rewrite — recursive SortableContext |
| `frontend/src/components/features/courses/admin/AdminLearnNodeCreateDialog.tsx` | **new** — tạo folder/lesson + metadata + MD template |
| `frontend/src/components/features/courses/admin/AdminLearnNodeRenameDialog.tsx` | **new** — rename dialog |
| `frontend/src/components/features/courses/admin/AdminLearnLessonMetadataTab.tsx` | **new** — sửa metadata lesson |
| `frontend/src/components/features/courses/admin/AdminLearnLessonEditorPageClient.tsx` | metadata tab + breadcrumb + confirm dialog xóa mapping |
| `frontend/src/components/features/courses/admin/AdminLearnCourseListPageClient.tsx` | archive + purge action + ConfirmDialog |
| `frontend/src/components/features/courses/CourseCatalogClient.tsx` | rewrite — BE filter + paging + smooth render |
| `frontend/src/components/features/courses/CourseFilterPanel.tsx` | nút Lọc/Reset + status "Tất cả" |
| `frontend/src/hooks/useAdminLearnCourseTree.ts` | refreshTree fix; `submitReorderSiblings` |
| `frontend/src/hooks/useAdminLearnCourses.ts` | `submitArchiveCourse`/`submitPurgeCourse` |
| `frontend/src/hooks/useAdminLearnLessonEditor.ts` | metadata-only update không bị chặn content rule |
| `frontend/src/hooks/useCourses.ts` | `loadCourses(params)` trả count/next/previous |
| `frontend/src/services/courses.service.ts` | `deleteAdminLearnCourse(mode)`; `reorderAdminLearnNodes` |
| `frontend/src/types/{course,lesson}.types.ts` | `tags` param; `course_slug`/`course_title` |
| `frontend/messages/{vi,en}.json` | key mới cho dialog/tree/metadata/catalog |
| `frontend/package.json` | + @dnd-kit/{core,sortable,utilities} |

## Notes / Caveats

- **Title không unique** (xác nhận DB): phương án 1-ô-title dùng chung an toàn; không thêm ràng buộc unique (theo quyết định người dùng).
- **Existing nodes** có `position=0` toàn bộ (data cũ trước khi auto-position) — drag lần đầu sẽ reindex 0..n.
- **Catalog filter universe** (category/tag chips) nạp từ `/api/learn/{categories,tags}`. Ở Pass 2 (`authorization_enabled=true`), nếu Member thiếu quyền đọc taxonomy thì chips có thể rỗng — chỉ ảnh hưởng UI filter, không lỗi (catch im lặng). Cần xác nhận quyền taxonomy cho Member nếu muốn filter đầy đủ ở Pass 2.
- **Pre-existing tsc error** tại `AdminChallengeCreatePageClient.tsx` (challenge area) — không liên quan, không đụng tới.
- Drag-drop hiện chưa có `DragOverlay` (preview node khi kéo); hành vi vẫn đầy đủ — có thể thêm sau nếu cần đẹp hơn.
