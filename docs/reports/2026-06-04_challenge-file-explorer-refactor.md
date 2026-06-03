# Session Report: Challenge file-explorer refactor (parity với Learn)

**Date:** 2026-06-04
**Slices / Areas:** Slice 6 (Challenge) — tổ chức lại UI + nền tảng BE tree/filter

## Summary

Tái tổ chức tính năng Challenge để thể hiện đúng mô hình **cây folder toàn cục** (folder = node, CTF = leaf) dưới dạng **file explorer mở sâu**, đưa Challenge ngang tầm các nâng cấp gần đây của Learn (F42/F43/F44). Giữ nguyên mô hình dữ liệu (không migration, không đụng `BaseNode` dùng chung). Sửa các lỗi BE ẩn (sort loạn, N+1 khi move, thiếu atomic create, filter client-side, `isSolved` không hoạt động). Tất cả test backend pass (full suite exit 0); FE `tsc` sạch, `build` exit 0, lint không thêm lỗi mới.

## Completed Items

- BE: sort folder-first + title A→Z cho challenge node list/children
- BE: `create_challenge_node_atomic` (item → tạo draft Challenge + node atomic)
- BE: `move_challenge_node_bulk` (bulk_update, hết N+1) + cycle/depth guard
- BE: endpoint explorer `GET /api/challenge/nodes/explorer/` và `/{id}/explorer/`
- BE: filter tag-AND (`?tags=`) + solved (`?solved=`) + `LimitOffsetPagination` + `is_solved` ở list serializer
- BE: seed `challenge.max_tree_depth`
- BE: 8 test mới (sort, atomic create, explorer visibility/breadcrumb, no-N+1, tag-AND, solved, pagination envelope)
- FE: admin file-explorer (breadcrumb/back, URL `?folder=`, tile + checkbox bulk delete, tạo folder/challenge, Move dialog)
- FE: trang taxonomy riêng `challenges/{categories,tags}` (ConfirmDialog, mirror Learn)
- FE: user catalog mode-aware (explorer khi no-filter, flat-search BE khi có filter, highlight đã-giải)
- FE: gỡ tree tab + 2 taxonomy dialog + `window.confirm/prompt` + route `new`
- i18n (en/vi), MSW (explorer + atomic create + tag-AND/solved/is_solved)

## Key Implementations

### Cây challenge — folder-first sort (KHÔNG reorder thủ công)
1. Challenge độc lập → không cần thứ tự học như Learn; bỏ reorder kéo-thả.
2. List/children `order_by('is_item', Lower('title'), 'id')` → folder trước, rồi title A→Z.
3. `position` vẫn ghi (end-of-list khi create) cho tương thích nhưng không dùng để sort.
4. Không đổi `BaseNode.Meta.ordering` → không migration, Learn reorder không regress.

### create_challenge_node_atomic
1. Resolve `parent_id` → folder (reject nếu parent là item); validate max depth (`challenge.max_tree_depth`, default 5).
2. Folder: tạo node với `path`, `position=Max(siblings)+1`.
3. Item: trong `transaction.atomic()` tạo draft `Challenge` (slug auto từ title, status=DRAFT, `storage_path=challenges/{slug}`) rồi tạo node `is_item=True, challenge=...`.
4. Trả node kèm `challenge_slug` → FE điều hướng `/admin/challenges/{slug}`.

### move_challenge_node_bulk (hết N+1)
1. Tính `old_prefix`/`new_prefix` từ path; kiểm tra cycle qua path + đi ngược chuỗi parent (belt-and-suspenders cho path cũ).
2. Fetch toàn bộ descendant 1 lần (`Q(path=old)|Q(path__startswith=old+'.')`), validate depth.
3. `node.save(update_fields=...)` + một `bulk_update(['path','updated_at'])` cho mọi descendant.

### Explorer endpoint
1. `list_explorer_children(parent, user)`: folders + items (lọc theo `_allowed_statuses` → member chỉ published), sort folder-first+title.
2. `solved_challenge_ids` batch 1 query → set, truyền context (tránh N+1 `is_solved`).
3. `build_breadcrumb`: trail từ `path` + chính folder.
4. Response: `{folder, breadcrumb, nodes[]}`; item kèm challenge summary + `is_solved`.

### User catalog mode-aware
1. "Filter active" = bất kỳ search/difficulty/category/tags/solved (snapshot qua `appliedRef`, Apply/Reset như Learn).
2. No-filter → explorer mode: load `/nodes/explorer/` theo URL `?folder=`, render folder cards + challenge cards (truyền `isSolved`), breadcrumb + back (router.push → browser back chạy).
3. Có filter → flat-search: `/challenges/?limit/offset&tags&solved...`, phân trang BE, overlay `opacity-60`.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/views/challenge_nodes.py` | Sort folder-first; create dùng atomic; move dùng bulk; thêm explorer actions |
| `backend/api/views/challenges.py` | `LimitOffsetPagination` + list inject `solved_ids` |
| `backend/api/services/challenge_service.py` | atomic create, bulk move, explorer helpers, filter tag-AND + solved, solved_ids |
| `backend/api/serializers/challenge.py` | `ChallengeNodeWriteSerializer`, `ChallengeExplorerSerializer`, `is_solved` + `challenge_slug` |
| `backend/api/urls.py` | routes `nodes/explorer/`, `nodes/{id}/explorer/` |
| `backend/api/management/commands/seed_config.py` | seed `challenge.max_tree_depth` |
| `backend/api/tests/test_challenge_node_api.py`, `test_challenge_api.py` | +8 tests, cập nhật theo contract mới |
| `frontend/.../challenges/admin/AdminChallengeExplorerClient.tsx` (+ NodeCreateDialog, MoveDialog, TaxonomyPageClient) | file-explorer manager mới |
| `frontend/.../challenges/{ChallengeCatalogClient,ChallengeFilterPanel,ChallengeFolderCard,ChallengeBreadcrumb}.tsx` | user catalog mode-aware |
| `frontend/src/hooks/useAdminChallengeExplorer.ts` | hook explorer (load/create/move/bulkDelete) |
| `frontend/src/services/challenges.service.ts`, `types/challenge.types.ts` | folder-contents, solved param, explorer types |
| `frontend/app/[locale]/(admin)/admin/(protected)/challenges/{page,categories/page,tags/page}.tsx` | landing → explorer; taxonomy routes |
| `frontend/src/mocks/{data/fixtures.ts,handlers/{admin-challenges,challenges}.handlers.ts}` | node shape mới, explorer, atomic create, tag-AND/solved |
| `frontend/messages/{en,vi}.json` | keys `explorer.*`, `taxonomy.*`, `filter.solved*`, `catalog.*` |
| (deleted) | `AdminChallengeTreeTab/NodeTree/NodeRow`, `AdminChallenge{Category,Tag}Dialog`, `AdminChallengeListPageClient`, `AdminChallengeCreatePageClient`, `useAdminChallengeTree`, route `challenges/new` |

## Notes / Caveats

- **Reorder kéo-thả CỐ TÌNH bỏ** cho challenge (quyết định người dùng: CTF độc lập). Sort theo tên A→Z. Khác với Learn (giữ reorder).
- Lint còn 4 vấn đề **pre-existing** trong `FlagSubmitForm.tsx`, `AdminChallengeInstancesPageClient.tsx`, `LessonViewerClient.tsx` (`react-hooks/set-state-in-effect`) — KHÔNG do đợt này; các file mới/sửa của đợt này lint sạch.
- Folder rename chưa có trong explorer (người dùng chỉ yêu cầu tạo/xóa). `updateChallengeNode` service vẫn còn để tái dùng sau.
- Wave 2 GitLab sync (6.8) và instance deploy thực vẫn deferred như trước.
