# Session 4 — Tier 4 Drift Report (Plan & Status)

> **Scope:** `docs/IMPL_PLAN.md` · `docs/STATUS.md` · `docs/TEAM_PLAN.md` · `docs/RELEASE_CHECKLIST_SLICE5_8.md`
> **Code references:** `docs/reports/` index, git log (Slice 6 ship dates 2026-04-30 / 2026-05-02, Slice 11 tasks 11.4 / 11.5 ship 2026-04-30, frontend bugfix batch 2026-05-04).
> **Consolidation hooks:** C4 (TEAM_PLAN archive), C5 (RELEASE_CHECKLIST delete) — both already approved at Session 0.

---

## Tóm tắt severity

| Severity | Tickets |
|---|---|
| Critical | D-04-02 |
| Major | D-04-01, D-04-03, D-04-04, D-04-05, D-04-08, D-04-12, D-04-13 |
| Minor | D-04-06, D-04-07, D-04-09, D-04-10, D-04-11, D-04-14 |
| Cosmetic | D-04-15 |

---

## A. STATUS.md drift

### D-04-01  STATUS hard-references RELEASE_CHECKLIST (sắp xoá)

- **Hiện trạng:** `docs/STATUS.md:6-7`
  > Release docs gate for upcoming slices:
  > - `docs/RELEASE_CHECKLIST_SLICE5_8.md` is the required consistency checklist before opening Slice 5-8 implementation PRs.
- **Conflict:** C5 đã chốt xoá file này (Slice 5 & 8 ship rồi). Block "required gate" trở thành mệnh đề lỗi thời và sẽ broken-link sau khi xoá.
- **Severity:** major
- **Phương án:**
  - A. Xoá hẳn 2 dòng này khỏi STATUS.md (đồng bộ với C5 apply).
  - B. Viết lại thành 1 dòng "Slice 5–8 ship rồi, gate đã đóng. Xem `docs/reports/2026-04-01_slice5-8-docs-consistency-freeze.md` cho lịch sử."
- **Recommend:** B — giữ pointer ngắn để người đọc reports cũ vẫn có context.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-02  Q-CONFIG-01 mâu thuẫn status với LEDGER (Session 1)

- **Hiện trạng:** `docs/STATUS.md:48`
  > [Q-CONFIG-01] — Default system config seed values | Slice 0 (Task 0.3), Slice 1 | **OPEN**
- **Conflict:** LEDGER Session 1 entry: "Q-CONFIG-01 Status `OPEN` → Status `RESOLVED (Option A)` + Implementation ref `seed_config.py:81-88` (D-01-02)". Sau apply S1 thì DECISIONS.md đã ghi RESOLVED nhưng STATUS.md không sync.
- **Severity:** **critical** — sai trạng thái blocker.
- **Phương án:**
  - A. Update STATUS.md:48 sang `**RESOLVED (Option A)**` + cùng link section.
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-03  STATUS Completed table dừng ở 2026-04-20 — thiếu Slice 6 + 11.4/11.5 + bugfix batch

- **Hiện trạng:** `docs/STATUS.md:66-129` (bảng "Completed") — entry cuối là Slice 9 Task 9.5 (2026-04-20).
- **Conflict:** Các report sau đó tồn tại nhưng không phản ánh trong bảng:
  - `2026-04-30_slice6-task6-1-challenge-crud-api.md`
  - `2026-04-30_slice6-task6-2-challenge-node-api.md`
  - `2026-05-02_slice6-task6-3-challenge-flag-crud.md`
  - `2026-05-02_slice6-task6-4-flag-submission-progress.md`
  - `2026-05-02_slice6-task6-5-instance-api-stubs.md`
  - `2026-05-02_slice6-task6.6-challenge-frontend.md`
  - `2026-05-02_slice6-challenge-admin-editor.md` (Task 6.7)
  - `2026-04-30_leaderboard-task11-3.md`
  - `2026-04-30_slice11-task-11.4-statistics.md`
  - `2026-04-30_slice11-task-11.5-dashboard.md`
  - `2026-05-04_frontend-bugfix-batch.md` (chỉ được ghi trong "Last updated:" header line 4, không có row)
- **Severity:** major.
- **Phương án:**
  - A. Thêm row chi tiết cho từng task vào bảng "Completed" theo template của các entry cũ.
  - B. Thêm 1 row tổng kết cho mỗi slice ("Slice 6 / Tasks 6.1–6.7 (2026-04-30 → 2026-05-02)") + giữ liên kết tới reports.
- **Recommend:** A — bảng đã chi tiết per-task cho Slice 1–5, giữ pattern nhất quán; tránh khó tra cứu.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-04  STATUS "Completed Task Evidence (Reports)" thiếu nhiều report sau 2026-04-20

- **Hiện trạng:** `docs/STATUS.md:133-183` — bảng dừng ở `2026-04-20_slice1-4-browser-regression-fixes.md`.
- **Conflict:** Thiếu các report sau:
  - Slice 6: `2026-04-30_slice6-task6-1`, `…6-2`, `…6-3`, `…6-4`, `…6-5`, `…6.6`, `2026-05-02_slice6-challenge-admin-editor.md`
  - Slice 11: `2026-04-30_leaderboard-task11-3.md`, `…task-11.4-statistics.md`, `…task-11.5-dashboard.md`
  - Tổng hợp khác: `2026-05-04_frontend-bugfix-batch.md`, `2026-04-01_slice5-8-docs-consistency-freeze.md`, `2026-04-01_fe-be-integration-fixes.md`, `2026-04-15_fe-layout-canonicalization.md`, `2026-04-14_slice7-quiz-ui-retest-msw.md`, `2026-04-14_slice8-profile-users-ui-test-report.md`, `2026-04-14_bugfix-h4-h6-h8-m6-m7-m9-m10.md`
- **Severity:** major (truy report không tra được từ STATUS).
- **Phương án:**
  - A. Append từng entry còn thiếu (preserve thứ tự thời gian).
  - B. Tự động hoá: thêm note "Full list at `docs/reports/`" và bỏ bảng evidence (đỡ phải maintain).
- **Recommend:** A — bảng evidence là cầu nối giữa task ↔ report, đáng giữ. Có thể bổ sung note "newer reports auto-listed at `docs/reports/`" ở cuối.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-05  STATUS Slice 11 sub-table thiếu ✅ cho Task 11.4 + 11.5

- **Hiện trạng:** `docs/STATUS.md:297-304`
  > | Frontend: Admin detailed statistics | Low | |
- **Conflict:** Report `2026-04-30_slice11-task-11.4-statistics.md` và `2026-04-30_slice11-task-11.5-dashboard.md` tồn tại nhưng task này không được mark ✅, không có note hoàn thành. Cũng không thấy Task 11.5 trong sub-table (chỉ có 4 tasks: leaderboard API, admin stats API, FE leaderboard, FE admin detailed stats — task 11.5 admin dashboard home bị bỏ qua).
- **Severity:** major.
- **Phương án:**
  - A. Update sub-table: mark 11.4 ✅ (2026-04-30) + thêm row 11.5 ✅ (2026-04-30).
- **Recommend:** A.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-06  STATUS "Future Blockers" section title misleading

- **Hiện trạng:** `docs/STATUS.md:40-63` — section title `## 📋 Future Blockers (Resolve Before Task Implementation)`. Trong bảng 19 hàng, 18 đã `**RESOLVED**`, chỉ Q-CONFIG-01 còn "OPEN" — nhưng D-04-02 chỉ ra rằng đó cũng đã được RESOLVED ở Session 1.
- **Conflict:** Sau khi apply D-04-02 thì **toàn bộ bảng là RESOLVED**, không còn "future blocker" nào → tiêu đề sai.
- **Severity:** minor.
- **Phương án:**
  - A. Đổi title thành `## Slice 5–11 Decisions (all RESOLVED — historical)` + giữ bảng làm tra cứu.
  - B. Move toàn bảng vào subsection "Historical Decisions" ở cuối STATUS.md (collapse khỏi vùng đầu).
  - C. Xoá hẳn bảng — DECISIONS.md đã canonical.
- **Recommend:** A — giữ tra cứu nhanh, đổi title phản ánh thực trạng.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-07  STATUS 2 historical sections "CRITICAL BLOCK RESOLVED" + "Pre-Implementation Gate" ở đầu file

- **Hiện trạng:** `docs/STATUS.md:11-37` — 2 bảng historical chiếm 27 dòng ngay đầu file. Tất cả RESOLVED.
- **Conflict:** STATUS là living tracker; người đọc cần thấy "Đang làm gì / sắp tới" trước, không phải lịch sử Slice 0–1 đã đóng.
- **Severity:** minor (UX of doc).
- **Phương án:**
  - A. Gộp 2 section thành 1 "## Historical Decision Gates (all RESOLVED)" và move xuống cuối STATUS (cùng vị trí với D-04-06 nếu Option A đó được áp).
  - B. Giữ nguyên vị trí, chỉ đổi heading icon `✅`/`⚠️` → `📜 Historical` để giảm nhiễu thị giác.
  - C. Giữ nguyên hoàn toàn.
- **Recommend:** A — kết hợp với D-04-06 thành một block "Historical / Resolved" duy nhất ở cuối.
- **Cần user quyết:** [x] applied 2026-05-14

---

## B. IMPL_PLAN.md drift

### D-04-08  Slices 5–6, 7 (phần lớn), 8, 9, 11 thiếu ✅ COMPLETED markers ở task heading

- **Hiện trạng:** Pattern hiện tại trên Slice 0–4: mỗi task đã xong có suffix `✅ COMPLETED (YYYY-MM-DD)` ngay trên heading (vd. `### Task 0.2 — … ✅ COMPLETED (2026-03-17)`).
  Nhưng:
  - Slice 5: `### Task 5.1` → `### Task 5.7` đều không marker (lines 614, 633, 649, 659, 669, 675, 682)
  - Slice 6: `### Task 6.1` → `### Task 6.7` đều không marker (lines 740, 749, 758, 767, 781, 790, 804)
  - Slice 7: 7.2, 7.3, 7.4, 7.6, 7.7 không marker (chỉ 7.1 và 7.5 có)
  - Slice 8: toàn bộ 8.1–8.5 không marker
  - Slice 9: toàn bộ 9.1–9.5 không marker
  - Slice 11: toàn bộ 11.1–11.5 không marker
- **Conflict:** Reports xác nhận tất cả đã ship. STATUS.md sub-tables cũng mark ✅. Nhưng IMPL_PLAN bản thân là nguồn canonical cho slice plan, mà không nhất quán → người đọc IMPL_PLAN nghĩ rằng task chưa xong.
- **Severity:** major.
- **Phương án:**
  - A. Bổ sung `✅ COMPLETED (YYYY-MM-DD)` cho mọi task có report (date lấy từ report filename).
  - B. Đổi cách mark: thêm 1 summary box `> Slice N status: ALL COMPLETE (YYYY-MM-DD)` ở đầu mỗi slice, bỏ marker per-task.
  - C. Bỏ pattern marker hoàn toàn, point sang STATUS.md cho live status.
- **Recommend:** A — giữ nhất quán với pattern hiện có của Slice 0–4. Mỗi task heading rất giàu context để người đọc nhanh thấy.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-09  Task 11.2 / 11.3 có completion date dạng text inline, không phải heading marker

- **Hiện trạng:**
  - `IMPL_PLAN.md:1072` — "Implemented 2026-04-17 with `backend/api/services/admin_stats_service.py`…" (text body)
  - `IMPL_PLAN.md:1079` — "Implemented 2026-04-30 with canonical `/api/stats/leaderboard/`…" (text body)
- **Conflict:** Inconsistent với pattern Slice 0–4 (suffix heading). Nếu apply D-04-08 Option A, các text body này thành dư thừa.
- **Severity:** minor.
- **Phương án:**
  - A. Move date vào heading suffix, xoá text body redundant.
  - B. Giữ text body như mô tả phong phú hơn, thêm marker ngắn ở heading.
- **Recommend:** B — text body có thêm file path implementation; preserve. Chỉ thêm `✅ COMPLETED (date)` vào heading.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-10  Task 5.8 (Outline Sync) status không rõ — pending hay deferred?

- **Hiện trạng:** `IMPL_PLAN.md:710-728` — heading "Task 5.8 — Outline Sync (deferrable)". Không marker COMPLETED, không marker DEFERRED. STATUS.md:248 ghi "Outline sync API + tab (deferrable) | Low | Sync blocking MVP; no Celery needed" — cũng không status rõ. Task 6.8 (GitLab sync) cùng tình trạng — không marker, mơ hồ.
- **Conflict:** Người đọc không biết các task này pending hay đang lùi vô thời hạn.
- **Severity:** minor.
- **Phương án:**
  - A. Mark `⏸️ DEFERRED` — coi như lùi vô thời hạn.
  - B. Mark `📋 PENDING (low priority)` — vẫn nằm trong roadmap.
- **User quyết:** **B** — chỉ AI (Slice 10) deferred, các task khác đều pending sẽ làm. Áp dụng cho cả Task 5.8 và Task 6.8.
- **Applied:** IMPL_PLAN.md Task 5.8 / Task 6.8 + STATUS.md tương ứng đều mark `📋 PENDING`.
- **Cần user quyết:** [x] applied 2026-05-14

---

### D-04-11  IMPL_PLAN mention paths `frontend/src/components/AIChatPanel/index.tsx` không tồn tại (Slice 10 deferred)

- **Hiện trạng:** `IMPL_PLAN.md:1045` — File path cho Slice 10 Task 10.4. Slice 10 đã marked DEFERRED và file chưa tạo.
- **Conflict:** Không phải drift gây hại, nhưng nếu kẻ scan IMPL_PLAN expect path tồn tại → confusion.
- **Severity:** cosmetic.
- **Phương án:**
  - A. Thêm comment "(to be created when Slice 10 activated)" cạnh file path.
  - B. Giữ nguyên — section đã có DEFERRED warning ở đầu Slice 10.
- **Recommend:** B — DEFERRED block (line 1020-1024) đã đủ.
- **Cần user quyết:** [x] applied 2026-05-14

---

## C. TEAM_PLAN.md — Apply C4 (archive)

### D-04-12  TEAM_PLAN.md toàn bộ là historical pre-implementation (2026-03-12)

- **Hiện trạng:** `docs/TEAM_PLAN.md:1-657`. Section "Hiện trạng" (line 49-71) ghi "Chưa triển khai: API views, Auth, RBAC, Frontend, Migrations, 12+ open questions" — toàn bộ đều đã xong. Section "Gantt" estimates "~32 ngày" — đã hoàn tất. Section "Phân công vai trò" — vai trò đã hoàn thành.
- **Conflict:** File là historical context; vai trò "live planning doc" đã hết. Đã quyết C4 archive.
- **Severity:** major (file lỗi thời chiếm chỗ live docs).
- **Phương án:**
  - A. (Apply C4) Move `docs/TEAM_PLAN.md` → `docs/reports/2026-03-12_team-plan-snapshot.md` + thêm 1 dòng header note "Historical 2-person team plan snapshot" + ghi LEDGER.
  - B. Archive về `docs/archive/team_plan.md` thay vì reports/.
  - C. Xoá hẳn (git log lưu lại nội dung).
- **Recommend:** A — reports/ là folder lịch sử chính thống, prefix ngày khớp dấu vết đã có (2026-03-12).
- **Cần user quyết:** [x] applied 2026-05-14

---

## D. RELEASE_CHECKLIST_SLICE5_8.md — Apply C5 (delete)

### D-04-13  RELEASE_CHECKLIST_SLICE5_8.md hoàn toàn lỗi thời

- **Hiện trạng:** `docs/RELEASE_CHECKLIST_SLICE5_8.md:1-84` — gate doc pre-implementation cho Slice 5/6/7/8. Cả 4 slice đã ship; toàn bộ unchecked checkboxes ở § "Release Sign-Off" line 78-82.
- **Conflict:** Gate đã đóng (Slice 5–8 đã release). Đã quyết C5 xoá hẳn.
- **Severity:** major.
- **Phương án:**
  - A. (Apply C5) Xoá `docs/RELEASE_CHECKLIST_SLICE5_8.md` + ghi LEDGER `removed` với commit reference.
  - B. Archive thay vì xoá (đối nghịch với C5 đã chốt).
- **Recommend:** A — đã quyết C5; git log preserves nội dung khi cần.
- **Cần user quyết:** [x] applied 2026-05-14

---

## E. Cross-reference cleanup sau C4 + C5 apply

### D-04-14  Các tham chiếu sống tới TEAM_PLAN / RELEASE_CHECKLIST trong live docs

- **Hiện trạng:** Grep cross-doc tìm thấy references **trong live docs** (không phải reports/intests):
  - `docs/STATUS.md:6-7` — RELEASE_CHECKLIST gate (covered ở D-04-01).
  - `docs/normalization/03-tier3-drift.md:255` — historical mention in drift report (acceptable, drift reports là log).
  - `docs/normalization/README.md` — consolidation map mention (acceptable).
- **Conflict:** Sau khi apply C4+C5, các reference broken-link nếu không cleanup. STATUS:6-7 là live; phải sửa.
- **Severity:** minor (chỉ 1 reference live — D-04-01).
- **Phương án:**
  - A. Xử lý qua D-04-01 (cùng patch).
- **Recommend:** A — gộp fix vào D-04-01.
- **Cần user quyết:** [x] applied 2026-05-14 (tự động khi duyệt D-04-01)

---

### D-04-15  Các tham chiếu trong `plan/*.md` và `docs/intests/*.md` (historical)

- **Hiện trạng:** Grep tìm thấy 8+ reference trong `D:\PBL5\ILS_v2\plan\*.md` (pre-implementation per-feature plans) và 1 trong `docs/intests/2026-04-20_slice5-integration-browser-checklist.md`. Đây là historical artifacts.
- **Conflict:** Reports/intests/plan đã thoả thuận **không đụng** (giữ nguyên dấu vết lịch sử). Nhưng người đọc sẽ thấy broken-link khi mở các file này sau khi C4+C5 apply.
- **Severity:** cosmetic — LEDGER giải quyết bằng cách cho phép traceback.
- **Phương án:**
  - A. Không đụng các file historical; LEDGER ghi `removed` cho RELEASE_CHECKLIST và `archived → docs/reports/2026-03-12_team-plan-snapshot.md` cho TEAM_PLAN. Người đọc dùng LEDGER tra cứu.
  - B. Sửa các broken-link trong historical files (nghịch nguyên tắc, không nên).
- **Recommend:** A — đúng quy tắc đã thoả thuận; LEDGER chính là cơ chế cho trường hợp này.
- **Cần user quyết:** [x] applied 2026-05-14

---

## Tóm tắt file thay đổi nếu duyệt theo recommend

| File | Thay đổi |
|---|---|
| `docs/STATUS.md` | D-04-01 (replace RELEASE_CHECKLIST line), D-04-02 (Q-CONFIG-01 → RESOLVED), D-04-03 (append 11+ rows Completed), D-04-04 (append 10+ rows Reports), D-04-05 (mark 11.4 ✅, add 11.5 row), D-04-06 (rename Future Blockers section), D-04-07 (consolidate historical sections + move bottom) |
| `docs/IMPL_PLAN.md` | D-04-08 (add ✅ markers to ~25 task headings), D-04-09 (add markers to 11.2/11.3), D-04-10 (mark 5.8 DEFERRED + sync STATUS) |
| `docs/TEAM_PLAN.md` | D-04-12: archive → `docs/reports/2026-03-12_team-plan-snapshot.md` |
| `docs/RELEASE_CHECKLIST_SLICE5_8.md` | D-04-13: remove (C5 apply) |
| `docs/normalization/LEDGER.md` | Append entries cho D-04-02, D-04-12, D-04-13, và các renames của STATUS sections |

**File reduction:** -2 (TEAM_PLAN archived, RELEASE_CHECKLIST deleted) → khớp với plan -2 ở Session 4.

---

## Câu hỏi mở cho user

1. **D-04-04** — bảng "Completed Task Evidence (Reports)" có giá trị tra cứu không? Hay tốt hơn là dẹp toàn bộ và point vào `docs/reports/` ls? Tôi nghiêng A (giữ + bổ sung), nhưng nếu user thấy maintenance burden không xứng → có thể chọn B.

2. **D-04-07 + D-04-06** — có muốn refactor mạnh STATUS.md không (move historical xuống cuối) hay giữ layout hiện tại chỉ sửa giấy tờ tối thiểu? Refactor mạnh dễ tra "Đang làm gì" hơn, nhưng diff sẽ to.

Sau khi user quyết, tôi apply theo từng ticket, mark `[x] applied`, và cập nhật LEDGER.
