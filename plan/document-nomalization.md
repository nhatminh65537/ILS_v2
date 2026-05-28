# Documentation Normalization & Consolidation — Multi-Session Plan

## Context

Hầu hết tính năng chính của ILS v2 đã hoàn thành (Slice 0–9, 11 ; Slice 10 deferred). Trong quá trình phát triển, các tài liệu trong `docs/` và root `.md` đã được edit ở nhiều session rời rạc → tích lũy:
- Bất nhất doc-to-doc và drift doc-to-code.
- **Quá nhiều file**, nhiều file trùng vai trò hoặc rườm rà.

Mục tiêu của đợt normalize:

1. **Giảm số file live docs** — gộp các file trùng vai trò, archive cái stale, bỏ cái không cần.
2. Đưa các file còn lại về trạng thái nhất quán nội bộ.
3. Đối chiếu doc với code thực tế (models, urls, frontend pages).
4. Thiết lập kỷ luật để chỉnh sửa sau này không tái phát nợ kỹ thuật.

**Số liệu hiện tại:**
- Root `.md`: 5 file (`README`, `AGENT`, `CLAUDE`, `DEV_WORKFLOW`, `openmemory`)
- `docs/*.md`: 15 file live
- `docs/prd/*.md`: 11 file
- **Tổng live docs: 31** → mục tiêu giảm xuống ~18–22.

**Ràng buộc đã thống nhất:**
- Scope: doc-to-doc **và** doc-to-code.
- `docs/reports/` (~70) và `docs/intests/` (9) **giữ nguyên** — dấu vết lịch sử.
- Cần **một ledger** để reports cũ vẫn truy ngược được sau khi rename/merge/xoá.
- PRD 09 (AI Assistant) — thêm header `DEFERRED`, không đụng nội dung.
- **Con người là quyết định cao nhất.** Tier hierarchy / conflict resolution rules trong AGENT.md chỉ là gợi ý, **không tự động áp dụng**. Mọi xung đột (kể cả `AGENT.md`/`CLAUDE.md` vs doc khác) đều phải user duyệt từng item.
- Mỗi session: **drift report dưới dạng discussion tickets → user quyết từng item → mới apply**.

---

## Consolidation map — đề xuất gộp/xoá (cần user duyệt ở Session 0)

> Đây là **đề xuất**, không phải quyết định. Session 0 sẽ ngồi với user duyệt bảng này trước khi triển khai bất kỳ session nào.

| # | File hiện tại | Đề xuất | Lý do | Recommend |
|---|---|---|---|---|
| C1 | `AGENT.md` (root) + `CLAUDE.md` (root) | Gộp thành **1 file** | Cùng vai trò, gần như duplicate | Giữ `CLAUDE.md` (Claude Code auto-loads); xoá `AGENT.md` hoặc để 5 dòng pointer |
| C2 | `DEV_WORKFLOW.md` (root) | Gộp vào `CLAUDE.md` §Workflow | 171 dòng, không cần file riêng | Merge |
| C3 | `docs/API.md` + `docs/API_ROUTE_MAPPING.md` | Gộp thành **1 file** | API_ROUTE_MAPPING chỉ 53 dòng, là subset của API | Giữ `docs/API.md` |
| C4 | `docs/IMPL_PLAN.md` + `docs/TEAM_PLAN.md` | Đánh giá kỹ — có thể gộp | TEAM_PLAN 657 dòng, có thể trùng vai trò | Cần đọc kỹ ở Session 0 trước khi quyết |
| C5 | `docs/RELEASE_CHECKLIST_SLICE5_8.md` | **Archive** | Slice 5 & 8 đã ship | Move vào `docs/reports/` hoặc `docs/archive/` |
| C6 | `docs/FE_SETUP.md` + `docs/FE_CONVENTIONS.md` + `docs/FE_PAGE_INVENTORY.md` | Gộp thành **1 file** `docs/FRONTEND.md` | Tổng 472 dòng, cùng chủ đề FE | Single file 3 sections |
| C7 | `docs/STATUS.md` | Giữ riêng | High-churn, đáng tách khỏi IMPL_PLAN | Giữ |
| C8 | `docs/prd/*.md` (11 file) | Giữ nguyên cấu trúc 11 file | Mỗi PRD là 1 feature, đáng tách | Giữ; chỉ gắn header DEFERRED cho 09 |
| C9 | `docs/BUGS.md` | Prune fixed bugs | 104 dòng, nhiều entry đã đóng | Trim trong Session 6 |
| C10 | `openmemory.md` (root) | Giữ riêng | Auto-managed by MCP, không thể merge | Giữ |
| C11 | `README.md` (root) | Giữ riêng, refresh nội dung | Entry-point cho contributor mới | Refresh ở Session 6 |

**Nếu tất cả đề xuất được duyệt:** 31 → 23 live docs (–8 file).

---

## Phương pháp chung cho mọi session

Mỗi session normalize tuân theo 4 bước:

1. **Survey** — đọc các doc trong scope + code references. Tuyệt đối không sửa.
2. **Drift report** — viết file `docs/normalization/NN-<topic>-drift.md`. Mỗi item dưới dạng **discussion ticket**:
   ```
   ### D-NN-XX  <tên ngắn>
   - **Hiện trạng:** <doc/file:line — quote ngắn>
   - **Conflict:** <1–2 câu>
   - **Severity:** critical / major / minor / cosmetic
   - **Phương án:** A. … / B. … / C. …
   - **Recommend:** <A|B|C> vì <lý do>
   - **Cần user quyết:** [ ] chưa duyệt
   ```
3. **Discussion + review gate** — user đọc, chat lại từng item. Không apply tới khi user duyệt.
4. **Apply** — sửa theo quyết định; rename/move/xoá → append `docs/normalization/LEDGER.md`. Cuối session: mark item là `[x] applied`.

**Nguyên tắc bất khả xâm phạm:** chỉ sửa file ở bước 4 sau khi user đã duyệt từng item. Không "auto-apply" dựa trên Tier hierarchy. **AGENT.md/CLAUDE.md không miễn trừ** — nếu session nào phát hiện chúng mâu thuẫn, đưa vào drift report của session đó.

---

## Kế hoạch session (gọn lại còn 7 session, gồm cả file-reduction)

### Session 0 — Consolidation map duyệt + setup ledger

**Việc:**
- User cùng đọc bảng "Consolidation map" ở trên, duyệt từng dòng C1–C11 (giữ / sửa đề xuất / loại).
- Đọc nhanh `TEAM_PLAN.md` vs `IMPL_PLAN.md` để chốt C4.
- Tạo:
  - `docs/normalization/README.md` — workflow + map đã duyệt.
  - `docs/normalization/LEDGER.md` — bảng `old_path:section → new`.
- Sửa nhẹ `AGENT.md` (hoặc `CLAUDE.md` nếu C1 chốt xoá AGENT) thêm 1 mục về normalization ledger.

**Đầu ra:** consolidation map đã chốt → các session sau chỉ thực thi.

---

### Session 1 — Tier 1: REQUIREMENTS + PRDs + DECISIONS

**Scope (live docs):**
- `docs/REQUIREMENTS.md` (267)
- `docs/prd/*.md` (11 file)
- `docs/DECISIONS.md` (1259 — file nặng nhất)

**Code references:** `backend/api/models.py`, `backend/backend/settings.py`.

**Việc:**
- REQUIREMENTS ↔ PRDs (sibling check).
- DECISIONS — phân loại OPEN vs RESOLVED; mọi RESOLVED phải có dấu hiệu trong code.
- Tinh gọn DECISIONS: gom RESOLVED đã xa vào "Resolved (archived)" subsection để OPEN nổi bật.
- Mark `prd/09-ai-assistant.md` DEFERRED header.

**Đầu ra:** `docs/normalization/01-tier1-drift.md`.

---

### Session 2 — Tier 2: DATA_MODEL + CONFIG + ARCHITECTURE

**Scope (live docs):**
- `docs/DATA_MODEL.md` (917)
- `docs/CONFIG.md` (250)
- `docs/ARCHITECTURE.md` (667)

**Code references:** `backend/api/models.py`, `seed_config.py`, `seed_roles.py`, cấu trúc thư mục `backend/`/`frontend/`.

**Việc:**
- DATA_MODEL ↔ ORM (entity-by-entity).
- CONFIG ↔ seed_config keys ↔ DATA_MODEL §SystemConfig.
- ARCHITECTURE ↔ thư mục thực tế + mọi RESOLVED kiến trúc trong DECISIONS.

**Đầu ra:** `docs/normalization/02-tier2-drift.md`.

---

### Session 3 — Tier 3: API surface + merge API_ROUTE_MAPPING (C3)

**Scope (live docs):**
- `docs/API.md` (546)
- `docs/API_ROUTE_MAPPING.md` (53) — sẽ merge vào API.md nếu C3 duyệt.

**Code references:** `backend/<app>/urls.py`, `views.py`, `serializers.py`.

**Việc:**
- Walk từng URL pattern → đối chiếu API.md.
- Cập nhật maturity tag (Stable/Partial/Planned/Deferred).
- **Apply C3:** merge API_ROUTE_MAPPING vào API.md, ghi LEDGER, xoá file cũ.

**Đầu ra:** `docs/normalization/03-tier3-drift.md`.

---

### Session 4 — Tier 4: Plan & status + xử lý C4, C5

**Scope (live docs):**
- `docs/IMPL_PLAN.md` (1138)
- `docs/STATUS.md` (344)
- `docs/TEAM_PLAN.md` (657) — có thể merge tuỳ C4
- `docs/RELEASE_CHECKLIST_SLICE5_8.md` (84) — archive theo C5

**Việc:**
- IMPL_PLAN ↔ STATUS đồng bộ (Slice 6 vừa xong → reflect).
- **Apply C4** theo quyết định Session 0.
- **Apply C5** archive RELEASE_CHECKLIST.

**Đầu ra:** `docs/normalization/04-tier4-drift.md`.

---

### Session 5 — Tier 5: Frontend docs + merge thành FRONTEND.md (C6)

**Scope (live docs):**
- `docs/FE_SETUP.md` (103)
- `docs/FE_CONVENTIONS.md` (134)
- `docs/FE_PAGE_INVENTORY.md` (235)

**Code references:** `frontend/app/[locale]/`, `frontend/src/`, `frontend/package.json`, `.env.example`.

**Việc:**
- Đối chiếu page inventory ↔ thư mục thật.
- Conventions ↔ patterns thật sự dùng.
- Setup env flags ↔ config thực tế.
- **Apply C6:** merge 3 file thành `docs/FRONTEND.md` với 3 sections (Setup / Conventions / Page Inventory).

**Đầu ra:** `docs/normalization/05-tier5-drift.md`.

---

### Session 6 — Meta + Bugs + xử lý C1, C2, C9, C11

**Scope (live docs):**
- `AGENT.md` (root, 349)
- `CLAUDE.md` (root, 349)
- `README.md` (root, 155)
- `DEV_WORKFLOW.md` (root, 171)
- `openmemory.md` (root, 275 — chỉ refresh status)
- `docs/BUGS.md` (104)

**Việc:**
- **Apply C1:** gộp AGENT/CLAUDE thành 1.
- **Apply C2:** merge DEV_WORKFLOW vào CLAUDE.md §Workflow.
- **Apply C9:** prune BUGS.md, giữ active.
- **Apply C11:** refresh README.md cho contributor mới (Slice 0–9, 11 đã ship).
- Verify Document Dependency Tree khớp file thực tế sau consolidation.
- Cập nhật openmemory.md status / components.

**Đầu ra:** `docs/normalization/06-meta-drift.md`.

---

### Session 7 — Cross-cutting final pass

**Việc (sau khi 6 session trên đã apply):**
- **Terminology audit** cross-doc: `challenge`/`Challenge`/`CTF challenge`; `quiz`/`Quiz`; `flag`; `member`/`Member`/`user`.
- **Broken link audit:** mọi markdown link / anchor cross-doc.
- **LEDGER review:** đảm bảo mọi rename/move/xoá ở Session 1–6 đều đã ghi.
- Random spot-check: mở 3–5 reports cũ ngẫu nhiên trong `docs/reports/` → verify mọi tham chiếu của chúng vẫn truy được (qua live doc hoặc qua LEDGER).
- **Final summary** ở `docs/normalization/07-final.md`.

---

## Critical files map

| Session | Live docs sửa | Code đọc (read-only) | File giảm |
|---|---|---|---|
| 0 | tạo `docs/normalization/{README,LEDGER}.md` + sửa nhẹ AGENT/CLAUDE | — | 0 (setup) |
| 1 | REQUIREMENTS, prd/*, DECISIONS | models.py, settings.py | 0 |
| 2 | DATA_MODEL, CONFIG, ARCHITECTURE | models.py, seed_*.py, cây thư mục | 0 |
| 3 | API, API_ROUTE_MAPPING | urls.py, views.py, serializers.py | **–1** (C3) |
| 4 | IMPL_PLAN, STATUS, TEAM_PLAN, RELEASE_CHECKLIST | git log, reports/ index | **–1 hoặc –2** (C4, C5) |
| 5 | FE_SETUP, FE_CONVENTIONS, FE_PAGE_INVENTORY | frontend/ | **–2** (C6: 3→1) |
| 6 | AGENT, CLAUDE, README, DEV_WORKFLOW, openmemory, BUGS | git log gần đây | **–2** (C1, C2) |
| 7 | tất cả live docs (sửa nhỏ) | — | 0 |

**Tổng giảm dự kiến: 6–7 file.**

---

## Verification (cuối Session 7)

- [ ] Số live docs giảm từ 31 → ~24 (đã đạt mục tiêu reduction).
- [ ] Mỗi live doc còn lại có maturity rõ (Active / Deferred / Archived).
- [ ] `docs/normalization/LEDGER.md` đầy đủ; spot-check 3 report cũ → mọi reference truy được.
- [ ] Cross-doc terminology grep: 0 conflict trên thuật ngữ nhạy cảm.
- [ ] Markdown link checker: không broken anchor cross-doc.
- [ ] Document Dependency Tree (trong CLAUDE.md sau merge) khớp 100% file thực tế.
- [ ] Mỗi RESOLVED decision có thể trace tới code/doc đã hiện thực.

---

## Cách bắt đầu session sau

User nói: "Tiếp tục normalize: Session N — <topic>". Plan file này nằm ở `~/.claude/plans/`; mỗi session sẽ:
1. Đọc plan + LEDGER + drift report các session trước (nếu liên quan).
2. Survey scope.
3. Sinh drift report tại `docs/normalization/NN-<topic>-drift.md`.
4. Chờ user duyệt từng item.
5. Apply + cập nhật LEDGER + mark `[x] applied` trong drift report.