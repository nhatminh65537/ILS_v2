# Session 5 — Tier 5 Frontend Drift Report

**Date:** 2026-05-14
**Scope:** `docs/FE_SETUP.md`, `docs/FE_CONVENTIONS.md`, `docs/FE_PAGE_INVENTORY.md`
**Code references:** `frontend/app/[locale]/`, `frontend/src/`, `frontend/package.json`, `frontend/.env.{local,production}`
**Apply at end:** **C6** — merge 3 file → `docs/FRONTEND.md`

---

## Tổng quan

Sau khi quét `frontend/app/` và `frontend/src/`:

- **45 page.tsx** + **7 layout.tsx** đang chạy.
- **6 stores**, **11 services**, **16 MSW handlers**, **15 file trong `src/lib/`**.
- Phần lớn FE_PAGE_INVENTORY chính xác về **tồn tại route**, nhưng **status (`implemented`/`skeleton`) lệch nặng** so với code hiện tại — nhiều route đã ship Slice 5/6/9/11 nhưng inventory vẫn ghi `skeleton`.
- FE_CONVENTIONS bỏ sót `(auth)` và `(catalog)` route groups trong "Surface Architecture Rules" (mention sau ở phần riêng nhưng không được liệt kê đầu).
- FE_SETUP "MSW Behavior" chỉ liệt kê 4 patterns admin handlers, thực tế có 16 handler files cover toàn bộ domain.
- 2 file `README.md` ở `frontend/src/lib/` và `frontend/src/components/` không được đề cập trong bất kỳ doc nào.

**Tổng số drift items:** 8 (4 major, 3 minor, 1 cosmetic).

---

## Drift items

### D-05-01  Inventory status lệch — 6 route đã implemented vẫn ghi skeleton

- **Hiện trạng:**
  - `FE_PAGE_INVENTORY.md:43` — `/leaderboard` Status: `skeleton` (nhưng directory map dòng 168 ghi `✅ implemented (Task 11.3)` — internal contradiction)
  - `FE_PAGE_INVENTORY.md:63-64` — `/challenges`, `/challenges/[slug]` Status: `skeleton`
  - `FE_PAGE_INVENTORY.md:103` — `/admin/dashboard` Status: `skeleton (Task 11.5)`
  - `FE_PAGE_INVENTORY.md:110` — `/admin/statistics` Status: `skeleton (Task 11.4)`
  - `FE_PAGE_INVENTORY.md:120-123` — `/admin/learn/courses[/new|/[slug]]`, `/admin/learn/lessons/[id]` Status: `skeleton (Task 5.7)`
  - `FE_PAGE_INVENTORY.md:131-135` — `/admin/challenges[/new|/[slug]|/[slug]/flags|/instances]` Status: `skeleton (Task 6.7)`
  - Directory map (dòng 187-221) cũng ghi `🔲 skeleton` cho admin learn, admin challenges, admin/dashboard, admin/statistics.
- **Code thực tế:** mỗi page.tsx import 1 `*PageClient` đã hiện thực:
  - `/leaderboard/page.tsx:2` → `LeaderboardPageClient` ✓
  - `/challenges/page.tsx:1` → `ChallengeCatalogClient` ✓
  - `/admin/dashboard/page.tsx:1` → `AdminDashboardPageClient` ✓
  - `/admin/statistics/page.tsx:1` → `AdminStatsPageClient` ✓
  - `/admin/learn/courses/page.tsx:1` → `AdminLearnCourseListPageClient` ✓
  - `/admin/challenges/page.tsx:1` → `AdminChallengeListPageClient` ✓
- **Reports xác nhận:** `2026-04-30_slice11-task-11.{3,4,5}*.md`, `2026-05-02_slice6-task6.6-challenge-frontend.md`, `2026-05-02_slice6-challenge-admin-editor.md`, `2026-04-16_slice5-task5-7-frontend-course-editor.md` đều tồn tại.
- **Conflict:** Inventory bị stale theo nhiều slice đã ship.
- **Severity:** **major** — đây là tài liệu reference chính cho FE; sai status làm onboarding nhầm.
- **Phương án:**
  - A. Cập nhật cả tables + directory map → `implemented` cho 6 nhóm route trên.
  - B. Cập nhật chỉ tables, để directory map ghi nguồn riêng (gây thêm drift).
  - C. Thêm cột "Last verified date" để dễ flag stale lần sau.
- **Recommend:** **A** — sửa cả 2 chỗ; áp dụng cùng C6 luôn để FRONTEND.md ra đời với status đúng. Lưu ý vẫn giữ `skeleton` cho `/forgot-password` và `/reset-password` vì chúng thực sự là placeholder ("Coming soon.").
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-02  Surface Overview ghi sai layout group cho auth entry

- **Hiện trạng:** `FE_PAGE_INVENTORY.md:17`
  ```
  | User surface | `/{locale}/*` | `/{locale}/login` | `[locale]/(app)` |
  ```
  Layout Group cho User surface ghi `[locale]/(app)`, nhưng auth entry `/{locale}/login` thực sự ở `[locale]/(auth)/login/page.tsx`.
- **Conflict:** Cột "Layout Group" của hàng "User surface" đại diện cho cả surface, nhưng auth entry thuộc group khác. Người đọc dễ hiểu sai.
- **Severity:** **minor** — gây confusion onboarding.
- **Phương án:**
  - A. Tách thành 3 hàng: User auth surface (`(auth)`), User app surface (`(app)`), User catalog surface (`(catalog)`).
  - B. Đổi nhãn cột "Layout Group" thành "Authenticated Layout Group" và ghi chú phía dưới rằng auth entry ở `(auth)`.
  - C. Bỏ cột "Layout Group" khỏi Surface Overview, dựa vào tables chi tiết.
- **Recommend:** **A** — rõ ràng nhất, phản ánh đúng kiến trúc.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-03  Profile redirect page (`/profile/page.tsx`) thiếu trong Profile table

- **Hiện trạng:** `FE_PAGE_INVENTORY.md:80-85` — bảng "User Surface — Profile" có 3 row ([username], settings, sessions), thiếu `/profile/page.tsx` (redirect → settings). Directory map dòng 170 có ghi `page.tsx ✅ implemented (redirect → settings)`.
- **Conflict:** Tables nói thiếu, directory map nói đủ → internal contradiction.
- **Severity:** **minor**
- **Phương án:**
  - A. Thêm row `/profile` vào bảng Profile với note "redirect → /profile/settings".
  - B. Bỏ entry trong directory map (giữ tables là canonical).
- **Recommend:** **A** — table cần mô tả đầy đủ; redirect cũng là một route quan sát được.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-04  FE_SETUP "MSW Behavior" liệt kê handler không đầy đủ

- **Hiện trạng:** `FE_SETUP.md:64-73`
  ```
  - Handlers: `src/mocks/handlers/*.handlers.ts`
  ...
  Admin-specific handler coverage includes:
  - `/api/admin/permissions/*`
  - `/api/admin/roles/*`
  - `/api/users/{id}/roles/*`
  - `/api/admin/config/*`
  ```
- **Code thực tế:** `frontend/src/mocks/handlers/` có 16 file (auth, users, courses, lessons missing—handled inside courses, quizzes, quiz-ws, notifications, leaderboard, challenges, admin-permissions, admin-users, admin-stats, admin-challenges, rbac, system-config, shared, index).
- **Conflict:** Doc viết từ thời Slice 4 chỉ có handlers admin foundation; nay handlers cover toàn domain.
- **Severity:** **minor**
- **Phương án:**
  - A. Liệt kê đầy đủ 16 handler theo nhóm (Auth, Domain, Admin).
  - B. Bỏ liệt kê chi tiết, viết câu chung "Handlers cover toàn bộ domain trong API.md; xem `src/mocks/handlers/index.ts` để biết chi tiết".
- **Recommend:** **B** — handlers thay đổi nhanh; pointer ngắn ổn định hơn so với liệt kê dễ stale.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-05  FE_CONVENTIONS Surface Architecture Rules thiếu `(auth)` và `(catalog)` ngay đầu

- **Hiện trạng:** `FE_CONVENTIONS.md:24-34` chỉ nhắc `(app)` và `(admin)/admin` như 2 surface chính. `(auth)` không xuất hiện trong rules nhưng được dùng thực tế (dòng 158-163 inventory). `(catalog)` được giải thích chi tiết ở dòng 89-124 nhưng không nằm trong overview.
- **Code thực tế:** `frontend/app/[locale]/` có 4 route groups: `(auth)`, `(app)`, `(catalog)`, `(admin)`.
- **Conflict:** "Surface Architecture Rules" và "Folder Structure" liệt kê inconsistent.
- **Severity:** **minor**
- **Phương án:**
  - A. Cập nhật "Folder Structure" + "Surface Architecture Rules" để liệt kê đủ 4 groups, thêm 1 dòng cho `(auth)`.
  - B. Đổi tên "Surface" trong "Surface Architecture Rules" thành "Route Groups" và liệt kê đủ.
- **Recommend:** **A** — giữ thuật ngữ "surface" cho user/admin (2 audience chính), nhưng liệt kê tất cả 4 route groups trong "Folder Structure".
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-06  FE_CONVENTIONS Folder Structure thiếu `src/lib/`

- **Hiện trạng:** `FE_CONVENTIONS.md:8-22` không liệt kê `src/lib/` mặc dù được tham chiếu ở dòng 47 ("Services use shared client from `src/lib/axios.ts`"). Thư mục thực tế có 15 file (axios, utils, error maps, helpers).
- **Code thực tế:** `frontend/src/lib/README.md` đã giải thích vai trò của lib.
- **Conflict:** Folder Structure không khớp thực tế.
- **Severity:** **cosmetic** (vẫn truy được, nhưng nên đầy đủ).
- **Phương án:**
  - A. Thêm dòng `src/lib`: shared utilities (axios client, cn helper, error maps).
  - B. Thêm dòng đó + reference 2 file `README.md` trong `src/lib/` và `src/components/`.
- **Recommend:** **B** — tận dụng README đã có, không trùng lặp.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-07  Áp dụng C6 — merge 3 file thành `docs/FRONTEND.md`

- **Mục tiêu:** Một file duy nhất với 3 sections, đặt cạnh các live doc khác trong `docs/`.
- **Cấu trúc đề xuất cho `docs/FRONTEND.md`:**
  ```
  # Frontend — Setup, Conventions, Page Inventory
  
  ## 1. Setup
     1.1 Prerequisites
     1.2 Install
     1.3 Environment Files
     1.4 Development Commands
     1.5 MSW Behavior (gọn lại sau D-05-04)
     1.6 i18n Behavior
     1.7 Surface Routing (Current)
     1.8 Manual Smoke Checklist
     1.9 Add More shadcn Components
  
  ## 2. Conventions
     2.1 Folder Structure (sửa theo D-05-05, D-05-06)
     2.2 Surface Architecture Rules (sửa theo D-05-05)
     2.3 Naming Conventions
     2.4 Service Layer Rules
     2.5 State Management Rules (Zustand)
     2.6 i18n Rules
     2.7 Client/Server Boundaries
     2.8 Import Conventions
     2.9 Testing/Verification Conventions
     2.10 Catalog Route Group Pattern
     2.11 FE-BE Contract Baseline (Completed Slices)
  
  ## 3. Page Inventory
     3.1 Status Legend
     3.2 Surface Overview (sửa theo D-05-02)
     3.3 User Surface — Authentication
     3.4 User Surface — General
     3.5 User Surface — Learn
     3.6 User Surface — Challenge
     3.7 User Surface — Quiz
     3.8 User Surface — Profile (thêm row /profile redirect — D-05-03)
     3.9 Admin Surface — Authentication
     3.10 Admin Surface — General
     3.11 Admin Surface — Learn
     3.12 Admin Surface — Challenge
     3.13 Admin Surface — Quiz
     3.14 App Router — Directory Map (sửa skeleton → implemented theo D-05-01)
     3.15 Notes
  ```
- **Conflict:** N/A (đây là consolidation đã được duyệt từ Session 0).
- **Severity:** **major** (file-reduction goal).
- **Phương án:**
  - A. Cấu trúc 3 sections như đề xuất, áp dụng tất cả các fix D-05-01..06 inline khi merge.
  - B. Cấu trúc 3 sections nhưng KHÔNG sửa drift items khác — tách thành 2 commit (merge sạch trước, sửa sau).
  - C. Cấu trúc khác (gợi ý nếu user có ý khác).
- **Recommend:** **A** — vì:
  1. C6 đã chốt từ Session 0; A áp dụng triệt để mọi quyết định trong 1 lượt.
  2. Tránh tạo 1 file mới rồi sửa lại ngay (extra noise trong git history).
  3. LEDGER ghi 1 entry tổng cho merge + 6 entries cho fix items.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-05-08  Notes section trong FE_PAGE_INVENTORY tham chiếu `IMPL_PLAN.md` & `API.md` — verify không broken

- **Hiện trạng:** `FE_PAGE_INVENTORY.md:235` — "Planned routes align with `docs/IMPL_PLAN.md` slices and API inventory in `docs/API.md`."
- **Conflict:** Reference vẫn đúng (cả 2 file tồn tại), nhưng sau khi merge thành `FRONTEND.md`, anchor cũng thay đổi. Cần đảm bảo câu này vẫn nằm trong section §3.15 Notes của FRONTEND.md.
- **Severity:** **cosmetic**
- **Phương án:**
  - A. Giữ nguyên câu trong §3.15 Notes của FRONTEND.md.
  - B. Bỏ câu này (vì IMPL_PLAN/API tự ràng buộc với route inventory qua maturity tags).
- **Recommend:** **A** — giữ pointer, không gây hại.
- **Cần user quyết:** [x] applied (2026-05-14)

---

## LEDGER entries dự kiến (sau khi apply)

| Date | Old anchor | Action | New anchor / Note | Session | Commit |
|---|---|---|---|---|---|
| 2026-05-14 | `docs/FE_SETUP.md` (entire file) | merged_into | `docs/FRONTEND.md` §1 (C6, D-05-07) | S5 | _(pending)_ |
| 2026-05-14 | `docs/FE_CONVENTIONS.md` (entire file) | merged_into | `docs/FRONTEND.md` §2 (C6, D-05-07) | S5 | _(pending)_ |
| 2026-05-14 | `docs/FE_PAGE_INVENTORY.md` (entire file) | merged_into | `docs/FRONTEND.md` §3 (C6, D-05-07) | S5 | _(pending)_ |
| 2026-05-14 | `FE_PAGE_INVENTORY.md` 6 routes Status `skeleton` | renamed | `implemented` (D-05-01) | S5 | _(pending)_ |
| 2026-05-14 | `FE_PAGE_INVENTORY.md` Surface Overview 1 row "User surface" | renamed | Tách thành 3 row (auth/app/catalog) (D-05-02) | S5 | _(pending)_ |
| 2026-05-14 | `FE_PAGE_INVENTORY.md` Profile table (3 rows) | added | Row `/profile` redirect (D-05-03) | S5 | _(pending)_ |
| 2026-05-14 | `FE_SETUP.md` MSW handlers list (4 patterns) | renamed | Pointer to `src/mocks/handlers/index.ts` (D-05-04) | S5 | _(pending)_ |
| 2026-05-14 | `FE_CONVENTIONS.md` Surface Architecture Rules + Folder Structure | renamed | Liệt kê 4 route groups (D-05-05, D-05-06) | S5 | _(pending)_ |

---

## Ngoài scope (note cho session sau)

- **README.md (root)** mô tả frontend ở đâu? → cần check ở Session 6.
- **`STATUS.md`** có còn ghi Tasks 5.7 / 6.7 / 11.4 / 11.5 / 11.3 / 6.5+6.6 là pending không? → cross-check với S4 đã apply (TEAM_PLAN.md đã archive). Nếu vẫn pending → cần update ở session 6 hoặc final pass.
- **Bug pattern:** Inventory có cột "Slice" nhưng không có cột "Last updated" → đề nghị Session 7 cân nhắc thêm guard mechanism.
