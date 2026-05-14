# Session 3 — Tier 3: API Surface Drift Report

**Date:** 2026-05-14
**Scope:** `docs/API.md` (546 dòng) + `docs/API_ROUTE_MAPPING.md` (53 dòng)
**Code references đã đối chiếu:**
- `backend/backend/urls.py`
- `backend/auth_app/urls.py`
- `backend/api/urls.py`
- `backend/ai/urls.py`
- `backend/realtime/routing.py`
- `backend/api/views/*.py` (Grep `@action`, key viewsets)
- `backend/backend/settings.py` (JWT lifetimes, `PAGE_SIZE`)

**Bonus tracker:** Session 3 cũng sẽ **apply C3** sau khi user duyệt — merge `API_ROUTE_MAPPING.md` vào `API.md`.

**Status legend:** `[ ]` chưa duyệt · `[x] applied` đã áp dụng · `[~] reworded` user yêu cầu sửa lại

---

## A. Critical drifts (API.md actively misleads)

### D-03-01  §4.3 contradicts itself: "Planned" + "Stable" / "Partial" cùng chỗ

- **Hiện trạng:** `docs/API.md:440-510` §4.3 "Slice 6 — Challenge (CTF)" mở đầu bằng `"All routes under /api/challenge/* are planned. None are active in current routing."` Nhưng các sub-tables ngay sau đó dán nhãn `Partial (Task 6.3 — implemented)`, `Stable (Task 6.4 + 6.6)`, `Stable (Task 6.5)`. Sub-tables cũng trùng nội dung với §3.5 Active.
- **Conflict:** Section heading nói Planned, content nói Active. Reader bị mâu thuẫn. Toàn bộ §4.3 đang là "live ghost" — endpoints thật sự đang chạy trong `backend/api/urls.py:201-308`.
- **Severity:** critical
- **Phương án:**
  - A. Xoá hẳn §4.3 sub-tables về Flags / Flag submission / Instance, **move chúng vào §3.5 Active** (gộp thành 1 bảng đầy đủ cho `/api/challenge/*`). Giữ lại trong §4.3 chỉ phần thực sự planned: `POST /api/challenge/challenges/{slug}/sync-gitlab/` (Task 6.8).
  - B. Rewrite §4.3 mở đầu thành "Most routes are now active — see §3.5. Following table tracks remaining planned work." Giữ structure nhưng bỏ contradictory tables.
- **Recommend:** A — gọn hơn, đúng nguyên tắc "Section 3 = Active, Section 4 = Planned" của file.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-02  §3.5 Challenge thiếu hầu hết endpoint thực tế

- **Hiện trạng:** `docs/API.md:204-228` §3.5 chỉ liệt kê challenge/category/tag/node CRUD + node `children/move`. Thiếu hoàn toàn các endpoint thực tế trong `backend/api/urls.py:233-303`:
  - `GET / POST /api/challenge/challenges/{slug}/flags/`
  - `PUT/PATCH/DELETE /api/challenge/challenges/{slug}/flags/{flag_id}/`
  - `POST /api/challenge/challenges/{slug}/submit/`
  - `GET /api/challenge/challenges/{slug}/progress/`
  - `GET /api/challenge/progress/`
  - `POST /api/challenge/challenges/{slug}/instance/{start|stop}/`
  - `GET /api/challenge/challenges/{slug}/instance/status/`
  - `GET /api/challenge/instances/` (admin)
  - `POST /api/challenge/instances/{id}/kill/` (admin)
- **Conflict:** §3.5 Active table không phản ánh code; những endpoint này chỉ xuất hiện ở §4.3 (Planned) — gây hiểu nhầm rằng chúng chưa active.
- **Severity:** critical
- **Phương án:**
  - A. Bổ sung tất cả vào §3.5 Active table (kết hợp với phương án A của D-03-01).
- **Recommend:** A
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-03  §3.6 Quizzes thiếu QuizNode `move` endpoint trong table

- **Hiện trạng:** `docs/API.md:272-278` liệt kê quiz node `children/{id}/` nhưng **thiếu** `POST /api/quiz/nodes/{id}/move/` trong bảng. Endpoint tồn tại trong `backend/api/urls.py:196-200`.
- **Conflict:** Missing endpoint. Note inline ở `§3.6` không thấy mention.
- **Severity:** major
- **Phương án:** Thêm 1 dòng vào bảng §3.6.
- **Recommend:** add
- **Cần user quyết:** [x] applied (2026-05-14)

---

## B. Major drifts (missing / wrong)

### D-03-04  §3.2 Users thiếu 2 deprecated aliases `/profile/` và `/update_profile/`

- **Hiện trạng:** `backend/api/views/users.py:89-95` định nghĩa:
  ```python
  @action(detail=False, methods=['get'])
  def profile(self, request): return self.me_profile(request)

  @action(detail=False, methods=['patch'])
  def update_profile(self, request): return self.me_profile(request)
  ```
  Tạo ra `GET /api/users/profile/` và `PATCH /api/users/update_profile/` — không có trong `docs/API.md` §3.2.
- **Conflict:** Routes này là alias deprecated chưa được document, hoặc đang nằm "dead code" mà không ai biết.
- **Severity:** minor (vì là alias of `me/profile`)
- **Phương án:**
  - A. Document trong §3.2 với nhãn `Deprecated` và note "alias of `me/profile`; new code should use canonical path".
  - B. Xoá hẳn 2 @action trong views.py (yêu cầu thêm task ngoài scope normalize → spawn task riêng).
  - C. Im lặng — nhưng vi phạm "doc-to-code parity".
- **Recommend:** A trong session này. Có thể spawn 1 task riêng đề xuất B sau khi merge.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-05  §3.10 RBAC: missing canonical PATCH note + `users/{id}/roles/` trùng chỗ với §3.2

- **Hiện trạng:**
  - `docs/API.md:405-407` mô tả `/api/users/{id}/roles/...` trong §3.10 "Authorization / RBAC". Nhưng `urls.py:53-62` define các route này như "Custom user roles routes" — về nội dung là user-scoped, không phải `/api/admin/...`. Vị trí trong §3.10 hơi không nhất quán với §3.2 (chỉ liệt kê `/api/users/*`).
  - Ngoài ra `UserRoleViewSet` (re_path) chỉ có `list/create/destroy` methods — không có `retrieve`/`update`. API.md không thể hiện điều này rõ.
- **Conflict:** Topic placement + missing methods note.
- **Severity:** minor
- **Phương án:**
  - A. Giữ ở §3.10 (đúng vai trò RBAC), chỉ ghi rõ supported methods.
  - B. Move sang §3.2 dưới mục con "User role assignments" + xref §3.10.
- **Recommend:** A — RBAC là nơi tự nhiên hơn cho mapping role↔user.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-06  API_ROUTE_MAPPING: target route `/api/learn/lessons/` không tồn tại

- **Hiện trạng:** `docs/API_ROUTE_MAPPING.md:24` map `/api/lessons/` → `/api/learn/lessons/`. Nhưng `backend/api/urls.py:124-149` **không có** collection list `/api/learn/lessons/`; chỉ có detail/progress/questions cho ID cụ thể.
- **Conflict:** Target route trong mapping không tồn tại trong code.
- **Severity:** major
- **Phương án:**
  - A. Xoá row này khỏi mapping.
  - B. Đổi target thành "no canonical list endpoint — list operations remain on legacy `/api/lessons/`" và document trong note.
- **Recommend:** B — phản ánh đúng thực tế (legacy list vẫn dùng được, không có namespaced list).
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-07  API_ROUTE_MAPPING: `/api/challenge/challenges/{slug}/instance/` không tồn tại đơn lẻ

- **Hiện trạng:** `docs/API_ROUTE_MAPPING.md:30` map `/api/challenges/{id}/create-instance/` → `/api/challenge/challenges/{slug}/instance/`. Thực tế urls.py có 3 sub-routes: `/instance/start/`, `/instance/stop/`, `/instance/status/`. Không có unified `/instance/`.
- **Conflict:** Target route ảo.
- **Severity:** major
- **Phương án:** Sửa target thành liệt kê 3 sub-routes `/instance/{start|stop|status}/`.
- **Recommend:** sửa
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-08  API_ROUTE_MAPPING: `/api/quizzes/*` legacy gây hiểu nhầm là vẫn còn

- **Hiện trạng:** `docs/API_ROUTE_MAPPING.md:31-32` liệt kê `/api/quizzes/` và `/api/quizzes/{id}/` như "Legacy/Historical Route". Nhưng `docs/API.md:247` nói rõ **"Legacy flat routes (`/api/quizzes/*`) have been removed."** + `urls.py` không có route nào.
- **Conflict:** Mapping mô tả legacy còn sống, code đã remove.
- **Severity:** major
- **Phương án:**
  - A. Move 2 dòng này sang section riêng "Removed legacy routes (404)" trong file mapping (sẽ được merge vào API.md per C3).
  - B. Xoá 2 dòng — đã không còn liên quan.
- **Recommend:** A — giữ kiến thức cho new contributor đọc commit cũ.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-09  API_ROUTE_MAPPING: `/api/authz/*` chưa từng active

- **Hiện trạng:** `docs/API_ROUTE_MAPPING.md:33-34` liệt kê `/api/authz/permissions/` và `/api/authz/roles/` như legacy. Không có evidence trong git/code rằng các route này từng tồn tại — chỉ là "đề xuất ban đầu". `urls.py` đi thẳng vào `/api/admin/*`.
- **Conflict:** "Legacy" implies từng tồn tại; thực tế là "historical design draft only".
- **Severity:** minor
- **Phương án:**
  - A. Đổi cột "Status" thành "Never implemented; use target" hoặc move sang note.
  - B. Xoá hẳn.
- **Recommend:** B — giữ mapping file gọn; nếu cần lịch sử, git log captures.
- **Cần user quyết:** [x] applied (2026-05-14)

---

## C. Minor drifts (stale notes, contradictions in wording)

### D-03-10  §3.3 Courses §3.4 Lessons cross-ref tới `docs/API_ROUTE_MAPPING.md` sẽ bể sau khi merge

- **Hiện trạng:** `docs/API.md:187` (§3.4): `"For all new implementation work, use namespaced target routes from docs/API_ROUTE_MAPPING.md."` Sau C3 merge, file đó bị xoá → ref gãy.
- **Conflict:** Sẽ thành broken link sau apply C3.
- **Severity:** minor (pre-emptive fix khi merge)
- **Phương án:** Trong cùng bước merge, đổi tham chiếu sang anchor mới trong API.md (ví dụ `§6 Route Migration`).
- **Recommend:** Pre-emptive fix khi apply C3
- **Cần user quyết:** [x] applied (2026-05-14) (sẽ tự áp dụng cùng C3 nếu user duyệt block C3)

---

### D-03-11  §3.7 Notification "Still pending in Slice 9: None" có thể bỏ

- **Hiện trạng:** `docs/API.md:366-367`: `"Still pending in Slice 9: None."` Câu này không add value sau khi mọi pending đã đóng.
- **Conflict:** Cosmetic noise.
- **Severity:** cosmetic
- **Phương án:** Bỏ câu này.
- **Recommend:** bỏ
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-12  §1 Compatibility note đang stale (Slice 5/6 task references)

- **Hiện trạng:** `docs/API.md:28-31`: nói tới "Slice 5 Task 5.1", "remaining upcoming slices follow namespaced routes (`/api/challenge/*`, `/api/quiz/*`) and are tracked in Section 4 + IMPL_PLAN". Sau khi Slice 5–9, 11 đã ship, ngôn ngữ "upcoming" lạc hậu.
- **Conflict:** Reader hiểu là challenge/quiz vẫn upcoming.
- **Severity:** minor
- **Phương án:** Rewrite ngắn: "Section 3 lists currently active runtime routes. Legacy flat routes (`/api/quizzes/*`) are removed; legacy flat routes for Learn (`/api/courses/*`, `/api/lessons/*`) and Challenge (`/api/challenges/*`) remain active for compatibility. See §6 Route Migration for full mapping."
- **Recommend:** rewrite
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-13  §2 Global Conventions: "Default DRF permission: IsAuthenticated" vs `/api/users/` POST AllowAny

- **Hiện trạng:** `docs/API.md:39` nói default permission là `IsAuthenticated`. `docs/API.md:95` ghi `POST /api/users/` Auth: **No** — đúng theo `users.py:35-38` (`AllowAny` for `create`/`public_profile`/`public_activity`).
- **Conflict:** Mặt nội tại không sai nhưng dễ gây nghi ngờ: "Tại sao endpoint create user không yêu cầu auth?" Có thể đây là registration alternative; có thể là leftover. **Cần verify với user là intentional hay là security drift cần fix code.**
- **Severity:** **major (potential security)** nếu intent là không cho phép tạo user qua endpoint này.
- **Phương án:**
  - A. Doc xác nhận intentional → thêm note "Alternative registration path; identical behavior to `POST /api/auth/register/`."
  - B. Sai design → spawn task: thêm permission gate.
- **Recommend:** **AskUser** — đây là vấn đề thiết kế, không phải drift đơn giản.
- **Cần user quyết:** [x] applied (2026-05-14) — cần user xác nhận intent

---

### D-03-14  §2 Auth behavior: pagination & rate limit chi tiết chưa đối chiếu hết

- **Hiện trạng:** `docs/API.md:46-49` chỉ note JWT (`15min` access / `7 days` refresh — khớp `settings.py:175-176`), rate limit `10/min` cho refresh, và permission claims. Nhưng:
  - `PAGE_SIZE: 20` ở `settings.py:167` khớp API.md `:40` ("Default pagination: page size 20"). ✓
  - Không nhắc tới leaderboard có riêng `DEFAULT_PAGE_SIZE = 10` (`leaderboard_service.py:17`).
- **Conflict:** Leaderboard không dùng default DRF pagination → reader nhầm.
- **Severity:** minor
- **Phương án:** Thêm note ở §3.8 Leaderboard: "Page size default 10 (`limit` query param overrides; max not capped at service layer)."
- **Recommend:** thêm note
- **Cần user quyết:** [x] applied (2026-05-14)

---

## D. Cosmetic / structural

### D-03-15  Inline "Task X.Y update (date)" blocks rải rác — gọn thành 1 section

- **Hiện trạng:** API.md có ~12 inline blocks "Task 5.1 update (2026-04-15)", "Task 6.1 update (2026-04-30)"... rải khắp §3.3 / §3.5 / §3.6 / §3.7. Sau ship, các update này không còn quan trọng vì git log giữ history.
- **Conflict:** Doc dài vô ích, khó scan.
- **Severity:** cosmetic
- **Phương án:**
  - A. Gom vào §7 "Change Log" (1 bảng), đường dẫn ngắn gọn.
  - B. Xoá hết — git log captures.
  - C. Giữ nguyên.
- **Recommend:** B — giữ doc focus on "current state", history tra git.
- **Cần user quyết:** [x] applied (2026-05-14)

---

### D-03-16  §5 Deferred — AI dùng candidate route `/api/ai/*` nhưng ai/urls.py đã có 1 route stub

- **Hiện trạng:** `docs/API.md:521-528`: §5 Deferred says "Current backend root router does not activate AI URLs." Đúng — `backend/urls.py:24` comment out. Nhưng `backend/ai/urls.py:6` define `path("ask/", AIAskView.as_view())` (1 stub view tồn tại nhưng không được include).
- **Conflict:** Doc đúng về activation, nhưng có thể note thêm "scaffold exists at `backend/ai/urls.py` for future activation".
- **Severity:** cosmetic
- **Phương án:** Thêm 1 dòng note (optional).
- **Recommend:** thêm note ngắn (better doc-to-code parity)
- **Cần user quyết:** [x] applied (2026-05-14)

---

## E. C3 Merge plan — API_ROUTE_MAPPING.md → API.md

Sau khi user duyệt các tickets A–D, áp dụng C3 theo các bước:

1. **Tạo new section §6 "Route Migration / Legacy"** trong `API.md` (đẩy hiện tại §6/§7 xuống §7/§8):
   - §6.1 HTTP Route Mapping — bảng từ `API_ROUTE_MAPPING.md §2` (sau khi sửa D-03-06..09).
   - §6.2 WebSocket Auth Mapping — bảng từ `API_ROUTE_MAPPING.md §3`.
   - §6.3 Removed legacy routes (404) — danh sách `/api/quizzes/*` đã 404 (per D-03-08).
2. **Xoá** `docs/API_ROUTE_MAPPING.md`.
3. **Update inline references** trong API.md trỏ tới §6 thay vì `docs/API_ROUTE_MAPPING.md` (D-03-10).
4. **Search** trong toàn repo các tham chiếu khác tới `API_ROUTE_MAPPING.md`:
   - Đã thấy: `docs/RELEASE_CHECKLIST_SLICE5_8.md:53` (sẽ xoá ở Session 4 per C5 → no-op).
   - Re-scan trước khi commit để bảo đảm.
5. **Append LEDGER entry**:
   ```
   | 2026-05-14 | docs/API_ROUTE_MAPPING.md (entire file) | merged_into | docs/API.md §6 Route Migration / Legacy (C3) | S3 | _(pending)_ |
   | 2026-05-14 | API_ROUTE_MAPPING.md §2 row /api/lessons/ → /api/learn/lessons/ | renamed | API.md §6.1 row revised: target "no canonical list" note (D-03-06) | S3 | _(pending)_ |
   | 2026-05-14 | API_ROUTE_MAPPING.md §2 row /api/challenges/{id}/create-instance/ → /api/challenge/challenges/{slug}/instance/ | renamed | API.md §6.1 target split into start/stop/status (D-03-07) | S3 | _(pending)_ |
   | 2026-05-14 | API_ROUTE_MAPPING.md §2 rows /api/quizzes/* | moved | API.md §6.3 Removed legacy routes (D-03-08) | S3 | _(pending)_ |
   | 2026-05-14 | API_ROUTE_MAPPING.md §2 rows /api/authz/* | removed | Never implemented; dropped (D-03-09) | S3 | _(pending)_ |
   ```

---

## Summary table for user review

| # | Ticket | Severity | Recommend | Status |
|---|---|---|---|---|
| D-03-01 | §4.3 contradicts itself | critical | A: move active sub-tables to §3.5; keep only sync-gitlab in §4.3 | [x] applied |
| D-03-02 | §3.5 missing flags/instance endpoints | critical | Add all to §3.5 Active | [x] applied |
| D-03-03 | §3.6 missing quiz node move | major | Add row | [x] applied |
| D-03-04 | §3.2 missing 2 deprecated user aliases | minor | Document with Deprecated label | [x] applied |
| D-03-05 | §3.10 user-roles placement + methods | minor | Keep §3.10, list supported methods | [x] applied |
| D-03-06 | Mapping `/api/learn/lessons/` target ảo | major | Rewrite target note | [x] applied |
| D-03-07 | Mapping `/instance/` unified target ảo | major | Split into 3 sub-routes | [x] applied |
| D-03-08 | Mapping `/api/quizzes/*` đã 404 | major | Move to "Removed legacy routes" section | [x] applied |
| D-03-09 | Mapping `/api/authz/*` never existed | minor | Remove rows | [x] applied |
| D-03-10 | API.md refs to API_ROUTE_MAPPING.md | minor | Fix during C3 merge | [x] applied |
| D-03-11 | "Still pending: None" noise | cosmetic | Remove | [x] applied |
| D-03-12 | §1 Compatibility note stale | minor | Rewrite | [x] applied |
| D-03-13 | POST /api/users/ AllowAny — intent? | **major (security)** | **AskUser** | [x] applied |
| D-03-14 | Leaderboard page size not mentioned | minor | Add note in §3.8 | [x] applied |
| D-03-15 | Inline "Task X update" blocks | cosmetic | Remove (git log keeps history) | [x] applied |
| D-03-16 | §5 Deferred — note AI scaffold | cosmetic | Add 1 line | [x] applied |
| **C3** | Merge API_ROUTE_MAPPING → API.md §6 | — | After tickets above | [x] applied |

---

## Câu hỏi cần user quyết trước khi apply

Bốn câu hỏi cốt lõi (các minor/cosmetic có thể bulk-approve):

1. **D-03-13** (security): `POST /api/users/` AllowAny — intentional hay drift cần fix? Phương án A (doc) hay B (spawn task fix code)?
2. **D-03-04**: deprecated aliases `/profile/`, `/update_profile/` — document (A) hay spawn task xoá code (B)?
3. **D-03-15**: 12 inline "Task X update" blocks — xoá hết (B) hay gom vào §7 Change Log (A) hay giữ (C)?
4. **Còn lại (D-03-01..03, 05..12, 14, 16, C3)**: có thể bulk-approve theo recommend không?
