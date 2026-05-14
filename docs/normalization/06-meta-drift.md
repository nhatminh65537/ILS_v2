# Session 6 — Meta + Bugs Drift Report

**Date:** 2026-05-14
**Scope:** `AGENT.md`, `CLAUDE.md`, `README.md`, `DEV_WORKFLOW.md`, `openmemory.md`, `docs/BUGS.md`
**Consolidations to apply:** C1 (merge AGENT→CLAUDE), C9 (prune BUGS), C11 (refresh README)
**Code references checked:** `backend/api/models.py` (2059 dòng — không còn ~1195), `backend/backend/settings.py` (`'ai'` đang comment-out trong INSTALLED_APPS)

---

## Tóm tắt drift

| ID | File | Severity | Tóm gọn |
|---|---|---|---|
| D-06-01 | AGENT.md + CLAUDE.md | major (C1) | Hai file 100% identical (351 dòng giống nhau) — apply C1 |
| D-06-02 | CLAUDE.md §Key Documents | major | Bảng vẫn liệt kê 3 file FE đã merge (S5) + thiếu FRONTEND.md; line count `models.py` cũ |
| D-06-03 | CLAUDE.md §Document Dependency Tree | major | Tier 6 vẫn ghi "AGENT.md"; Tier 5 còn ghi "AGENT.md" trong propagation guide |
| D-06-04 | CLAUDE.md §Update Propagation Guide | major | 3 dòng tham chiếu "AGENT.md" cần đổi thành "CLAUDE.md" |
| D-06-05 | CLAUDE.md self-reference "Phase 3" | minor | Doc tham chiếu "Phase 3" nhưng không có heading nào tên "Phase 3" |
| D-06-06 | README.md | major (C11) | Tham chiếu file đã xoá (AGENT, FE_*); status info stale (chỉ liệt kê Slice 0–4); cây thư mục `docs/` thiếu file mới |
| D-06-07 | DEV_WORKFLOW.md | minor (C2 follow-up) | Line 63 ref `AGENT.md` (sẽ bị xoá); line 127 ref CLAUDE.md "Phase 3" cùng vấn đề D-06-05 |
| D-06-08 | docs/BUGS.md | major (C9) | 35 fixed bugs tích lũy; 3 doc-code inconsistency đã được S2 fix nhưng còn trong bảng |
| D-06-09 | openmemory.md §Key Files | minor | Tham chiếu `AGENT.md` (sẽ xoá); line count `models.py` stale |
| D-06-10 | openmemory.md §Document Dependency Tree | minor | Duplicate hoàn toàn từ CLAUDE.md, dễ drift |
| D-06-11 | openmemory.md cuối file | cosmetic | Stray malformed table row `| DEV_WORKFLOW.md | ... |` ở root level, không thuộc table nào |

11 items.

---

## Discussion tickets

### D-06-01  Apply C1 — Merge AGENT.md → CLAUDE.md

- **Hiện trạng:** `AGENT.md` (351 dòng) và `CLAUDE.md` (351 dòng) **100% identical** sau Session 0 (cả hai cùng được patch ledger callout). Đã verify bằng đọc full + grep.
- **Conflict:** Hai file duplicate, vi phạm DRY; mỗi update phải sync 2 nơi.
- **Severity:** major (đã quyết ở Session 0 — C1)
- **Phương án:**
  - A. Xoá `AGENT.md` hoàn toàn; mọi reference cũ trỏ sang `CLAUDE.md`. (decision đã chốt ở S0)
  - B. Để `AGENT.md` thành 5 dòng pointer trỏ tới `CLAUDE.md`.
- **Recommend:** **A** — đã chốt từ S0. Pointer file gây nhiễu thêm.
- **Impact:** Cần update 1 reference trong `README.md` (line 90), 1 reference trong `DEV_WORKFLOW.md` (line 63), 1 reference trong `openmemory.md` (line 30 + duplicated tree), 3 references trong propagation guide chính nó (CLAUDE.md line 92/95/96). LEDGER ghi `AGENT.md → removed (merged_into CLAUDE.md, identical content)`.
- **Cần user quyết:** [x] applied

---

### D-06-02  CLAUDE.md §Key Documents — bảng stale sau C3, C6

- **Hiện trạng:** `CLAUDE.md:8-26` (và identical `AGENT.md:8-26`):
  - Line 21–23 vẫn liệt kê: `docs/FE_SETUP.md`, `docs/FE_CONVENTIONS.md`, `docs/FE_PAGE_INVENTORY.md` (đã merged_into `FRONTEND.md` ở S5).
  - Không liệt kê: `docs/FRONTEND.md`, `docs/normalization/`, `docs/DECISIONS.md` (đang có `DECISIONS.md` ở line 20).
  - Line 26: "All domain ORM models (~1195 lines)" — thực tế `models.py` 2059 dòng (sai gần 2x).
  - Không liệt kê `docs/API.md` row mới sau S3 merge của API_ROUTE_MAPPING.
  - Line 24: "10 features" — đúng (10 numbered PRDs 01–10; PRD 09 deferred header đã thêm S1).
- **Conflict:** Bảng quick-reference chính của project trỏ tới file không tồn tại + line count sai gần gấp đôi.
- **Severity:** major
- **Phương án:**
  - A. Update bảng: gộp 3 dòng FE thành 1 dòng `docs/FRONTEND.md`; xoá row API_ROUTE_MAPPING (đã merge); update line count `models.py` thành "~2059 lines"; thêm hàng `docs/normalization/README.md` (workflow normalize).
  - B. Update tối thiểu: chỉ xoá 3 dòng FE đã chết, không thêm gì mới.
- **Recommend:** **A** — đây là quick-reference; người mới đọc cần thấy FRONTEND.md và normalization workflow.
- **Cần user quyết:** [x] applied

---

### D-06-03  CLAUDE.md §Document Dependency Tree — Tier 6 ghi "AGENT.md"

- **Hiện trạng:** `CLAUDE.md:64-67`:
  ```
  Tier 6 — Agent Index (aggregates all above)
  ├── AGENT.md              ← quick reference to everything
  └── openmemory.md         ← auto-managed project index (OpenMemory MCP)
  ```
  Sau C1, `AGENT.md` không còn → Tier 6 chỉ còn `openmemory.md` + chính `CLAUDE.md`.
- **Conflict:** Tree mô tả file đã bị xoá.
- **Severity:** major
- **Phương án:**
  - A. Đổi `AGENT.md` → `CLAUDE.md` (root file mới của Tier 6).
  - B. Xoá hẳn dòng `AGENT.md` (Tier 6 chỉ còn `openmemory.md` + tree được hosted bên trong CLAUDE.md tự nó).
- **Recommend:** **A** — `CLAUDE.md` thực chất *là* "agent index" sau merge, nên ghi rõ trong tree.
- **Cần user quyết:** [x] applied

---

### D-06-04  CLAUDE.md §Update Propagation Guide — 3 reference đến AGENT.md

- **Hiện trạng:** `CLAUDE.md:92, 95, 96`:
  - L92: `docs/ARCHITECTURE.md → docs/IMPL_PLAN.md ..., AGENT.md (update tech stack/conventions if changed)`
  - L95: `docs/STATUS.md → AGENT.md if new pre-implementation gates are added`
  - L96: `docs/API.md → ..., AGENT.md (if API doc governance or dependency rules change)`
- **Conflict:** Sau C1 không có AGENT.md.
- **Severity:** major
- **Phương án:**
  - A. Replace cả 3: `AGENT.md` → `CLAUDE.md`.
- **Recommend:** **A** (single-option, không có lựa chọn khác hợp lý).
- **Cần user quyết:** [x] applied

---

### D-06-05  CLAUDE.md tham chiếu "Phase 3" nhưng không có heading

- **Hiện trạng:** `CLAUDE.md:295, 322` (và identical AGENT.md + DEV_WORKFLOW.md:127):
  - L295: `After the report and STATUS.md update, execute **Phase 3** from CLAUDE.md:`
  - L322: `> See CLAUDE.md → Phase 3 for full rules and storage intelligence table.`
  - Nhưng CLAUDE.md không có heading nào tên `## Phase 3`. Section thực tế là `## Session Completion — Memory Update (MANDATORY for AI agent)` (L293).
- **Conflict:** Self-reference broken — người đọc tìm "Phase 3" sẽ không thấy.
- **Severity:** minor
- **Phương án:**
  - A. Đổi mọi tham chiếu "Phase 3" thành "Session Completion — Memory Update" (heading thực tế).
  - B. Đổi tên heading thành "## Phase 3 — Session Completion: Memory Update" để khớp với reference.
  - C. Xoá hẳn các dòng tham chiếu (chính section đã có nội dung đầy đủ ngay tại đó, không cần self-pointer).
- **Recommend:** **C** — L295/322 ngay trong cùng section, self-reference dư thừa. Xoá gọn hơn rename.
- **Cần user quyết:** [x] applied

---

### D-06-06  Apply C11 — Refresh README.md

- **Hiện trạng:** Nhiều drift trong `README.md`:
  - **L70-71** (Project Structure): `backend/ai/   # AI assistant feature` — không ghi DEFERRED; thực tế comment trong `settings.py:48` là `# 'ai',  # DEFERRED`.
  - **L77-82** (cây docs): chỉ liệt kê 4 file (`ARCHITECTURE`, `DATA_MODEL`, `CONFIG`, `IMPL_PLAN`) + `prd/`. Thiếu: `STATUS.md`, `BUGS.md`, `DECISIONS.md`, `API.md`, `REQUIREMENTS.md`, `FRONTEND.md`, `normalization/`. Đã có 10 file `docs/*.md` thực tế.
  - **L90** (Key Documents table): `AGENT.md` — sẽ bị xoá ở C1.
  - **L95-97**: 3 row FE_SETUP/FE_CONVENTIONS/FE_PAGE_INVENTORY — đã merged.
  - **L151**: "See `AGENT.md` → Implementation Status section for a full list of done/not-done features" — AGENT.md không có section nào tên "Implementation Status"; đó là `docs/STATUS.md`.
  - **L153**: "Current state: Slice 0 foundations, Slice 1 auth core, Slice 2 backend RBAC, Slice 3 backend system-config, Slice 4 frontend foundation are completed." — **rất stale**; thực tế Slices 0–9, 11 đã ship; chỉ còn Slice 5.8 Outline + Slice 6.8 GitLab pending; Slice 10 deferred.
  - **L155**: "Next: Continue with Slice 5+ feature delivery" — stale; Slice 5+ đã xong.
- **Conflict:** Entry-point cho contributor mới đang mô tả project ở thời điểm 2026-03 (8 tuần trước). Ai đọc README sẽ sai entirely.
- **Severity:** major (C11 đã chốt)
- **Phương án:**
  - A. Refresh đầy đủ:
    - Cập nhật Project Structure: thêm `# DEFERRED` cho `backend/ai/`; mở rộng cây `docs/` đầy đủ (hoặc ghi pointer `See CLAUDE.md §Key Documents`).
    - Cập nhật Key Documents table: `AGENT.md` → `CLAUDE.md`; gộp 3 row FE thành 1 row `FRONTEND.md`; thêm row `STATUS.md`, `DECISIONS.md` để trỏ đúng nơi tìm thông tin.
    - Sửa L151: trỏ trực tiếp `docs/STATUS.md` (đúng owner thông tin).
    - Refresh L153–155: liệt kê đúng trạng thái hiện tại (Slices 0–9, 11 done; Slice 5.8 + 6.8 pending; Slice 10 deferred).
  - B. Refresh tối thiểu: chỉ sửa các reference chết (AGENT, FE_*); để status text stale; user phải đọc STATUS.md để biết.
- **Recommend:** **A** — README là entry-point; nửa vời gây hiểu lầm tệ hơn không sửa.
- **Cần user quyết:** [x] applied

---

### D-06-07  DEV_WORKFLOW.md — 1 reference đến AGENT.md + Phase 3

- **Hiện trạng:**
  - `DEV_WORKFLOW.md:63`: `[`AGENT.md`](AGENT.md) — quick reference (stack, cách chạy project)` — sẽ broken sau C1.
  - `DEV_WORKFLOW.md:127`: `> AI agent: xem `CLAUDE.md → Phase 3` để biết đầy đủ.` — cùng vấn đề D-06-05.
- **Conflict:** Broken pointer sau C1 + Phase 3 không tồn tại.
- **Severity:** minor
- **Phương án:**
  - A. L63: `AGENT.md` → `CLAUDE.md`. L127: đổi "Phase 3" → "Session Completion — Memory Update" hoặc xoá self-pointer (tuỳ D-06-05).
- **Recommend:** **A** — kết hợp với quyết định D-06-05.
- **Cần user quyết:** [x] applied

---

### D-06-08  Apply C9 — Prune BUGS.md

- **Hiện trạng:** `docs/BUGS.md` 108 dòng:
  - **Active bugs:** 4 entry (L1, L2, L4, L5) — cần giữ:
    - L1: AI mock client (Slice 10 deferred — vẫn relevant).
    - L2: QuizQuestion thiếu composite index `(quiz, status)` — vẫn open, low priority.
    - L4: Playwright viewport breakpoint chưa verify — testing env note.
    - L5: FE rbac hardcoding (vẫn là tech debt, đã có roadmap migrate sang BE-first authz).
  - **Fixed bugs:** 35 entry (F1–F35), trải dài từ 2026-03-09 → 2026-05-04. Git log đã preserve nội dung; bảng quá dài không còn giá trị tham khảo cao.
  - **Doc–Code Inconsistencies (3 entry, "awaiting human decision"):** ALL 3 đã được S2 fix:
    - D-DOC-01 `course.structure_version` → đã có ở `models.py:686-688`.
    - D-DOC-02 `lesson.status` → đã có ở `models.py:770` (per LEDGER S2 entry D-02-01).
    - D-DOC-03 `lesson.video_duration` → đã có trong DATA_MODEL.md (per LEDGER S2 entry D-02-02).
  - **Tracking Notes:** dài dòng với 11 strikethrough fixes từ 2026-03-12 (đã đóng) + 1 reference tới D-DOC-01..03 (đã đóng).
- **Conflict:** File quá dày, mục "awaiting human decision" mà thực ra đã giải quyết.
- **Severity:** major (C9 đã chốt)
- **Phương án:**
  - A. **Prune mạnh:**
    - Giữ Active bugs (4 entry).
    - Giữ 10 fixed bugs gần nhất (F26–F35, 2026-04-19 → 2026-05-04).
    - Move F1–F25 vào subsection `## Fixed (Archived — see git log)` chỉ ghi 1 dòng tóm tắt: "F1–F25 (2026-03-09 → 2026-04-14): 25 bugs đóng trong các batch backend refactor + frontend MSW/i18n; xem git log + reports/ chi tiết."
    - Xoá toàn bộ section "Doc–Code Inconsistencies (awaiting human decision)" — tất cả đã đóng.
    - Tracking Notes: giữ Discovery session + reference tới ARCHITECTURE §7; xoá toàn bộ strikethrough list.
  - B. **Prune nhẹ:** Chỉ remove section Doc–Code Inconsistencies (đã đóng) + Tracking Notes strikethrough; giữ nguyên 35 fixed bugs.
  - C. **Prune vừa:** Giữ 15 fixed bugs gần nhất (F21–F35), archive F1–F20.
- **Recommend:** **A** — File mới sẽ ~30–40 dòng, dễ đọc; git log + `docs/reports/` đủ cho lịch sử chi tiết.
- **Cần user quyết:** [x] applied

---

### D-06-09  openmemory.md §Key Files — references stale

- **Hiện trạng:** `openmemory.md`:
  - L23: `backend/api/models.py | All ORM models (~1195 lines)` — thực tế 2059 dòng.
  - L30: `AGENT.md | AI agent quick-reference guide` — sẽ broken sau C1.
- **Conflict:** Cùng pattern D-06-02.
- **Severity:** minor
- **Phương án:**
  - A. Update L23 → "~2059 lines"; L30 → `CLAUDE.md`.
  - B. Để nguyên (openmemory được auto-managed bởi MCP, sẽ tự update sau).
- **Recommend:** **A** — MCP không tự fix path khi file bị rename; manual update cần thiết.
- **Cần user quyết:** [x] applied

---

### D-06-10  openmemory.md §Document Dependency Tree — duplicate từ CLAUDE.md

- **Hiện trạng:** `openmemory.md:232-264` chứa Tier hierarchy + Conflict resolution rules — duplicate hoàn toàn từ `CLAUDE.md:30-100`. Sau C1 và các sửa của D-06-03/D-06-04, openmemory cần resync.
- **Conflict:** Hai nguồn truth cho cùng tree → chắc chắn drift theo thời gian.
- **Severity:** minor (cosmetic)
- **Phương án:**
  - A. Replace block `openmemory.md:232-265` bằng pointer ngắn 3 dòng:
    ```
    ## Document Dependency Tree
    See `CLAUDE.md` §"Document Dependency Tree" for canonical Tier hierarchy + conflict resolution rules.
    ```
  - B. Update inline để khớp CLAUDE.md sau D-06-03 (giữ duplicate, sync nội dung).
  - C. Để nguyên (openmemory auto-managed).
- **Recommend:** **A** — pointer eliminates drift risk; openmemory vẫn giữ tóm tắt ngắn ở Tier 6 cuối.
- **Cần user quyết:** [x] applied

---

### D-06-11  openmemory.md cuối file — stray malformed table row

- **Hiện trạng:** `openmemory.md:267`:
  ```
  | `DEV_WORKFLOW.md` | **Dev session workflow** — checklist for all devs: pick task → plan → code → update docs → commit |
  ```
  Dòng này nằm root-level, không thuộc table nào (table Documentation kết thúc ở L230). Có vẻ là leftover khi merge edit.
- **Conflict:** Cosmetic — markdown render sẽ hiển thị nó sai context.
- **Severity:** cosmetic
- **Phương án:**
  - A. Move dòng đó vào table `## Documentation` (L215) thành 1 row hợp lệ.
  - B. Xoá hẳn (DEV_WORKFLOW đã có row khác? — không có, đây là duy nhất).
- **Recommend:** **A** — DEV_WORKFLOW.md là live doc, đáng có row trong Documentation table.
- **Cần user quyết:** [x] applied

---

## Tóm tắt apply order

Khi user duyệt:
1. **D-06-08** (BUGS prune) — độc lập, không ảnh hưởng file khác.
2. **D-06-06** (README refresh) — chứa references C1 nên cần làm trước hoặc song song với C1.
3. **D-06-09, D-06-10, D-06-11** (openmemory cleanup) — độc lập.
4. **D-06-02, D-06-03, D-06-04, D-06-05** (CLAUDE.md fixes) — gộp thành 1 lần edit lớn.
5. **D-06-07** (DEV_WORKFLOW pointer) — sau khi CLAUDE.md ổn.
6. **D-06-01** (xoá AGENT.md) — **CUỐI CÙNG**, sau khi mọi reference tới AGENT.md đã được dọn.
7. **LEDGER updates** cho mỗi file change.

---

## Files sẽ chạm

| File | Action |
|---|---|
| `AGENT.md` | DELETE (D-06-01) |
| `CLAUDE.md` | EDIT (D-06-02, -03, -04, -05) |
| `README.md` | EDIT (D-06-06, includes D-06-01 reference clean) |
| `DEV_WORKFLOW.md` | EDIT 2 dòng (D-06-07) |
| `openmemory.md` | EDIT (D-06-09, -10, -11) |
| `docs/BUGS.md` | EDIT (D-06-08, prune 80% nội dung cũ) |
| `docs/normalization/LEDGER.md` | APPEND ~7 entries |
