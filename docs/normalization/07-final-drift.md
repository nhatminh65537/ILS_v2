# Session 7 — Cross-cutting Final Pass — Drift Report

**Ngày:** 2026-05-14
**Scope:** Tất cả live docs (4 root + 10 docs/ + 12 prd/ = 26 file).
**Mục tiêu Session 7:**
- Terminology audit cross-doc.
- Broken link / anchor audit.
- LEDGER completeness check vs các Session 1–6.
- Spot-check 3–5 reports cũ để verify traceability qua LEDGER.
- Final summary file `07-final.md` sau khi mọi item được duyệt + apply.

---

## Phương pháp đã chạy

| Audit | Phạm vi | Cách chạy |
|---|---|---|
| Stale-ref audit | live docs only (loại trừ `docs/reports/`, `docs/intests/`, `docs/normalization/`, `plan/`) | grep tên 7 file đã merged/archived/removed: `AGENT.md`, `FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md`, `API_ROUTE_MAPPING.md`, `TEAM_PLAN.md`, `RELEASE_CHECKLIST_SLICE5_8.md` |
| Broken anchor audit | `DECISIONS.md` anchors referenced cross-doc | grep anchor `#q-xxx-nn-...` style refs vs actual `### Q-XXX-NN:` headings in DECISIONS.md |
| "Phase 3" leftover | live docs | grep "Phase 3" — verify Session 6 đã clean ở CLAUDE.md & DEV_WORKFLOW.md |
| LEDGER completeness | LEDGER.md entries | đối chiếu với findings của Session 1–6 |
| Spot-check reports | 5 reports ngẫu nhiên trong `docs/reports/` | grep refs đến file đã xoá; verify LEDGER traceback |
| Terminology audit | live docs | đếm xuất hiện `challenge/Challenge/CTF`, `quiz/Quiz`, `frontend/Frontend`, `WebSocket/websocket`, `JWT/jwt` — kiểm tra inconsistent variants |

---

## Tóm tắt findings

- **Stale-ref drift:** 6 vị trí trong live docs vẫn tham chiếu tên file đã xoá (3 major broken links + 3 minor historical mentions).
- **Broken anchor:** Không có. Old `#index-of-open-questions`, `#open-questions`, `#critical-block-issues` (renamed bởi S1) không được tham chiếu từ doc nào. ✅
- **"Phase 3" leftover:** Không có trong live docs. ✅ S6 đã clean.
- **PRD status drift:** `docs/prd/README.md` cột Status vẫn "Planned" cho 9/10 PRD dù tính năng đã ship. Major.
- **LEDGER:** 39/45 entries mark `_(pending)_` hoặc `_(pending commit)_`. Cần resolve trạng thái (annotation cosmetic).
- **README session table:** S1/S2/S3 thiếu dấu ✅ trong cột "File tạo"/"File giảm"; chỉ S4/S5/S6 có. Cosmetic.
- **Terminology:** Không phát hiện inconsistent (đã spot-check `CTF challenge` → 1 occurrence khớp ngữ cảnh; case variants `frontend/Frontend` đều legitimate context).
- **Spot-check reports:** 5 reports random — 1 (jwt-refresh) tham chiếu `AGENT.md`; tracing qua LEDGER lookup table (File-level changes) trả về `CLAUDE.md`. ✅ LEDGER hoạt động đúng mục đích.

---

## Drift items

### D-07-01  ARCHITECTURE.md folder tree vẫn liệt kê 3 FE doc đã xoá
- **Hiện trạng:** `docs/ARCHITECTURE.md:63-65`:
  ```
  │   ├── FE_SETUP.md         # Frontend setup + env + MSW/i18n bootstrap
  │   ├── FE_CONVENTIONS.md   # Frontend coding + service/store/type conventions
  │   ├── FE_PAGE_INVENTORY.md # Frontend routes inventory by slice
  ```
- **Conflict:** S5 đã merge 3 file này thành `docs/FRONTEND.md` nhưng folder tree trong ARCHITECTURE chưa được sync. Đây là **direct contradiction** với cấu trúc thư mục thật.
- **Severity:** **major** (folder tree là canonical reference trong architecture doc; ai đọc sẽ tin tưởng và nhầm).
- **Phương án:**
  - A. Replace 3 dòng trên bằng 1 dòng: `│   ├── FRONTEND.md         # Frontend setup + conventions + page inventory (3 sections)`.
  - B. Giữ thêm cả 3 dòng + 1 dòng FRONTEND.md với note "merged".
- **Recommend:** **A** — folder tree phản ánh hiện tại, không phải lịch sử (đã có LEDGER cho lịch sử).
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-02  IMPL_PLAN.md:802 — broken pointer
- **Hiện trạng:** `docs/IMPL_PLAN.md:802`:
  ```
  - MSW handlers for all challenge endpoints; follow `(catalog)` layout pattern from `docs/FE_CONVENTIONS.md`
  ```
- **Conflict:** `docs/FE_CONVENTIONS.md` không còn tồn tại (S5 merged_into FRONTEND.md §2).
- **Severity:** major (broken pointer).
- **Phương án:**
  - A. Đổi thành `docs/FRONTEND.md` §2 (Catalog Route Group Pattern subsection).
  - B. Đổi thành `docs/FRONTEND.md`.
- **Recommend:** **A** — cụ thể tới subsection để reader dễ jump.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-03  IMPL_PLAN.md:898 — broken pointer
- **Hiện trạng:** `docs/IMPL_PLAN.md:898`:
  ```
  **Catalog layout pattern:** see `docs/FE_CONVENTIONS.md` — Catalog Route Group Pattern section.
  ```
- **Conflict:** Cùng vấn đề D-07-02.
- **Severity:** major.
- **Phương án:**
  - A. `docs/FRONTEND.md` §2 — Catalog Route Group Pattern section.
- **Recommend:** **A**.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-04  openmemory.md:147 — broken pointer
- **Hiện trạng:** `openmemory.md:147`:
  ```
  ... See `docs/FE_CONVENTIONS.md` Catalog Route Group Pattern section.
  ```
- **Conflict:** Cùng vấn đề D-07-02/03.
- **Severity:** major.
- **Phương án:**
  - A. `docs/FRONTEND.md` §2 — Catalog Route Group Pattern section.
- **Recommend:** **A**.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-05  prd/README.md — Status table sai cho tất cả PRD đã ship
- **Hiện trạng:** `docs/prd/README.md:9-18` Feature Index table, cột Status:
  | # | Feature | Status hiện tại | Thực tế |
  |---|---|---|---|
  | 01 | Authentication | Planned | ✅ Shipped (Slice 1) |
  | 02 | Authorization | Planned | ✅ Shipped (Slice 2) |
  | 03 | Learn | Planned | ✅ Shipped (Slice 5) |
  | 04 | Challenge | Planned | ✅ Shipped (Slice 6) |
  | 05 | Quiz | Planned | ✅ Shipped (Slice 7) |
  | 06 | User Profile | Planned | ✅ Shipped (Slice 8) |
  | 07 | Notification | Planned | ✅ Shipped (Slice 9) |
  | 08 | Statistics | Planned | ✅ Shipped (Slice 11) |
  | 09 | AI Assistant | ⚠️ Deferred | ⚠️ Deferred (đúng) |
  | 10 | System Config | Planned | ✅ Shipped (Slice 3) |
- **Conflict:** 9/10 row sai. Index này là entry point cho người mới đọc tài liệu — sai status là sai prima facie.
- **Severity:** **major**.
- **Phương án:**
  - A. Update status table 9 row → `✅ Shipped` (giữ ⚠️ Deferred cho 09).
  - B. Đổi cột "Status" thành "Shipped Slice" để map thẳng (vd Slice 1, Slice 2, ...) — chính xác hơn nhưng đổi semantics column.
  - C. Bỏ cột Status (đã có `docs/STATUS.md` canonical) + thêm 1 dòng pointer "Status canonical: `docs/STATUS.md`".
- **Recommend:** **A** — tối thiểu thay đổi, đủ thông tin nhanh. Người muốn chi tiết → STATUS.md.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-06  STATUS.md:47 + openmemory.md:92 — historical Slice 4 description mention deleted FE files
- **Hiện trạng:**
  - `docs/STATUS.md:47` (table row, Slice 4 description): "... frontend onboarding docs (`FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md`)"
  - `openmemory.md:92`: "... UI primitives/documents (`FE_SETUP.md`, `FE_CONVENTIONS.md`, `FE_PAGE_INVENTORY.md`)."
- **Conflict:** Đây là historical narrative (kể chuyện Slice 4 đã làm gì), không phải pointer. Nhưng người đọc có thể click/grep và confused.
- **Severity:** **minor** (historical context, không broken nếu hiểu là past-tense).
- **Phương án:**
  - A. Thêm parenthetical: `... (FE_SETUP.md, FE_CONVENTIONS.md, FE_PAGE_INVENTORY.md — later merged into docs/FRONTEND.md by doc normalization 2026-05-14)`.
  - B. Replace tên 3 file → `docs/FRONTEND.md` (mất historical color nhưng gọn).
  - C. Giữ nguyên — LEDGER đã đủ trace.
- **Recommend:** **A** — historical accuracy + forward pointer. Người đọc thấy ngay context.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-07  LEDGER.md — 39/45 entries còn marker `_(pending)_` / `_(pending commit)_`
- **Hiện trạng:** Cột "Commit" trong table `## Entries`:
  - 30+ entries có `_(pending)_` hoặc `_(pending commit)_`.
  - Chỉ entries ban đầu của S0 không có marker.
- **Conflict:** Sau khi mỗi session apply commit, marker nên được update (annotation cosmetic; không broken nhưng làm noise và mất ý nghĩa cột Commit).
- **Severity:** **cosmetic**.
- **Phương án:**
  - A. Replace mọi `_(pending)_` / `_(pending commit)_` → `applied` (đơn giản, không cần commit hash).
  - B. Replace bằng git short SHA tương ứng — cần git log nhiều commit, công lớn.
  - C. Bỏ hẳn cột "Commit" (LEDGER không bị diluted; commit info đã trong git).
- **Recommend:** **C** — đơn giản hoá table, bớt 1 cột không bao giờ điền đúng. Người muốn commit hash → git log.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-08  README.md (normalization) session table — thiếu ✅ ở S1/S2/S3
- **Hiện trạng:** `docs/normalization/README.md` "Kế hoạch session" table:
  - S1/S2/S3: không có ✅ ở cột "File tạo" / "File giảm".
  - S4/S5/S6: có ✅ ở cả 2 cột.
- **Conflict:** Inconsistent visual: nhìn vào table dễ tưởng S1-S3 chưa xong. Nhưng Consolidation Map ngay phía trên đã show S1 (C8), S3 (C3) đều ✅ Applied.
- **Severity:** **cosmetic**.
- **Phương án:**
  - A. Thêm ✅ vào S1, S2, S3 trong session table, giống S4-S6.
  - B. Bỏ hết ✅ trong session table (vì Consolidation Map đã canonical).
- **Recommend:** **A** — visual consistency.
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

### D-07-09  Final summary file `07-final.md`
- **Hiện trạng:** Plan tổng yêu cầu sinh `docs/normalization/07-final.md` sau khi toàn bộ Session 7 items được duyệt + apply.
- **Conflict:** N/A — đây là deliverable cuối session.
- **Severity:** N/A (work item, không phải drift).
- **Phương án:**
  - A. Cuối session, tách thành 2 file: file này (`07-final-drift.md`, discussion) + `07-final.md` (final summary cô đọng kết quả + verification checklist + LEDGER stats).
  - B. Gộp drift discussion + final summary thành 1 file `07-final.md`.
- **Recommend:** **A** — phù hợp với pattern các session trước (drift report → discussion → apply → cập nhật).
- **Cần user quyết:** [x] applied (recommend A, 2026-05-14)

---

## Verification checklist (cuối Session 7, sau khi mọi item trên apply)

- [ ] D-07-01 → D-07-08 applied.
- [ ] LEDGER có 7 entry mới cho 7 fix của Session 7.
- [ ] Spot-check thêm 3 reports cũ ngẫu nhiên: mỗi reference đến file đã xoá đều truy ngược được qua LEDGER `## Quick lookup helpers` table.
- [ ] Live doc count = 26 file (đạt mục tiêu plan ~25, hoặc trong tolerance ±1).
- [ ] `docs/normalization/07-final.md` ghi: bảng số liệu (start 31 → end 26 = –5), bảng list 6 file đã xoá/merge (AGENT, API_ROUTE_MAPPING, TEAM_PLAN, RELEASE_CHECKLIST, FE_SETUP, FE_CONVENTIONS, FE_PAGE_INVENTORY = 7 file đi → +1 file mới FRONTEND.md = net –6), summary mỗi session làm gì, và pointer tới LEDGER.
- [ ] Đóng todo list Session 7.

---

## Pending từ session khác (out of S7 scope, ghi nhận)

- LEDGER `_(pending)_` marker cho S1/S2 (dates 2026-05-04) và S3-S6 (dates 2026-05-14) — gom xử lý trong D-07-07.
- README session table inconsistency — gom xử lý trong D-07-08.
- Các drift report `01..06-*-drift.md` có thể vẫn còn item `[ ] chưa duyệt` chưa flip — không trong S7 scope nhưng có thể audit nếu user yêu cầu.

---

## Bước tiếp theo

User review từng item D-07-01 → D-07-09. Sau khi duyệt:
1. Apply theo recommendations (hoặc theo lựa chọn của user).
2. Append 7 entry mới vào LEDGER cho 7 fix.
3. Viết `docs/normalization/07-final.md` (final consistency summary).
4. Mark `[x] applied` cho mỗi item trong file này.
