# Kế hoạch Test Tích hợp Manual — ILS v2

## Context

Dự án ILS v2 (cybersecurity learning platform self-hosted, 3 trụ: Learn / Challenge / Quiz) đã hoàn thành phần lớn các slice (0–9, 11). Người dùng muốn tiến hành **test tích hợp manual end-to-end** để verify tất cả tính năng đã làm hoạt động đúng khi kết nối với nhau (BE Django + FE Next.js + WS Daphne), trước khi đưa ra quyết định tiếp theo (deploy / triển khai Slice 4B / kết thúc dự án).

**Mục tiêu coverage:** Phát hiện càng nhiều bug tích hợp càng tốt — đặc biệt các điểm nối giữa FE/BE, giữa các slice (Learn ↔ Progress ↔ Notification ↔ Stats), giữa HTTP và WebSocket.

**Lựa chọn đã chốt:**
- DB: **SQLite** (dev default) — reset nhanh bằng cách xóa `backend/db.sqlite3`.
- Tích hợp ngoài: **bỏ qua** (Authentik, Outline, GitLab). Set `auth.sso_enabled=false`, `outline.enabled=false`, `challenge.deploy.enabled=false`.
- RBAC: **test 2 pass** — Pass 1 với `auth.authorization_enabled=false`, Pass 2 với `=true`.
- Format: **Checklist từng bước có Expected Result** + cột Pass/Fail/Notes.

**Scope deferred (không test):**
- Slice 10 (AI Assistant) — deferred.
- Slice 4B (Shared Tree) — pending.
- Email backend (forgot/reset password) — chỉ verify skeleton page render.

---

## 1. Chuẩn bị Database & Môi trường

### 1.1. Cài đặt dependencies (chỉ làm 1 lần đầu)

```powershell
# Tại d:\PBL5\ILS_v2 — Backend
.\.venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 1.2. Reset & seed database sạch (làm trước MỖI pass test)

```powershell
# Tại d:\PBL5\ILS_v2
# B1: Xóa DB cũ + migration cache (nếu cần reset hoàn toàn)
Remove-Item backend\db.sqlite3 -ErrorAction SilentlyContinue

# B2: Migrate + seed
cd backend
python manage.py migrate
python manage.py seed_config
python manage.py seed_roles
python manage.py seed_admin
# → tạo user: admin / admin (password mặc định, có Admin role)
cd ..
```

**Kết quả sau seed:**
- 3 role builtin: `Admin`, `Editor`, `Member`
- 1 user `admin` (password `admin`, có superuser + Admin role)
- `system_config` đã có default đầy đủ
- Permission auto-discovered nạp vào DB khi server start lần đầu

### 1.3. Tạo thêm 2 user test thủ công (qua API hoặc Django shell)

Sau khi backend start, dùng FE register page hoặc curl:

```powershell
# Tạo user Editor
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d '{\"username\":\"editor1\",\"email\":\"editor1@test.local\",\"password\":\"editor1234\"}'

# Tạo user Member
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d '{\"username\":\"member1\",\"email\":\"member1@test.local\",\"password\":\"member1234\"}'
```

Rồi vào FE admin (đăng nhập admin) **/vi/admin/rbac/users/[id]/roles** để gán role `Editor` cho `editor1`. (User `member1` mặc định có role Member sau register.)

**Tài khoản test chuẩn:**

| Username | Password | Role | Mục đích |
|----------|----------|------|----------|
| `admin` | `admin` | Admin (superuser) | Test admin surface, config, RBAC, broadcast |
| `editor1` | `editor1234` | Editor | Test content authoring (course/challenge/quiz CRUD) |
| `member1` | `member1234` | Member | Test learning flow, submit flag, attempt quiz |

### 1.4. Setup config cho từng pass test

**Pass 1 — Authorization bypass (test feature trước):**

Vào **/vi/admin/config** đăng nhập admin → tab `auth`:
- `auth.authorization_enabled` → **false**
- `auth.local_login_enabled` → **true**
- `auth.sso_enabled` → **false**
- `outline.enabled` → **false**
- `challenge.deploy.enabled` → **false**
- `system.maintenance_mode` → **false**

**Pass 2 — Authorization enforced (verify RBAC):**

Đổi `auth.authorization_enabled` → **true**, giữ các config khác như Pass 1. Log out + log in lại tất cả 3 user (để JWT lấy claim permission mới).

---

## 2. Lệnh chạy chương trình

### 2.1. Start backend (chọn 1 trong 2)

```powershell
# Mode A: HTTP only (KHÔNG hỗ trợ WebSocket → quiz/notification sẽ fail)
cd backend
python manage.py runserver
# → http://localhost:8000

# Mode B: ASGI với Daphne (BẮT BUỘC cho test WebSocket — Quiz session + Notification realtime)
cd backend
daphne -p 8000 backend.asgi:application
# → http://localhost:8000 + ws://localhost:8000/ws/*
```

> **Khuyến nghị:** Luôn dùng **Mode B (Daphne)** xuyên suốt đợt test để bao phủ cả WS, tránh phải restart đổi server giữa chừng.

### 2.2. Start frontend

```powershell
# Terminal riêng
cd frontend
npm run dev
# → http://localhost:4000
```

**Verify khởi động đúng:**
- BE: GET `http://localhost:8000/api/auth/sso/redirect/` → 200 hoặc redirect JSON (không lỗi 500)
- FE: Mở `http://localhost:4000` → redirect tới `/vi` homepage, không lỗi console

### 2.3. Reset giữa pass (khi cần)

```powershell
# Stop daphne (Ctrl+C) + npm dev (Ctrl+C)
# Xóa DB + seed lại theo §1.2
# Tạo lại user test theo §1.3
# Cấu hình lại config theo §1.4
# Restart
```

---

## 3. Phân loại Test theo Tính năng

Test theo thứ tự sau (dependency từ thấp đến cao):

| # | Nhóm | Số case | Pre-condition |
|---|------|---------|---------------|
| A | Authentication & Session | 10 | DB seeded |
| B | RBAC & Admin Users | 8 | A passed |
| C | System Config Admin | 6 | A passed |
| D | Learn (Course / Lesson / Progress) | 14 | A, B passed |
| E | Challenge (CTF + Flag submit) | 12 | A, B passed |
| F | Quiz (HTTP CRUD + WebSocket session) | 13 | A, B passed; Daphne running |
| G | User Profile & Sessions | 7 | A passed |
| H | Notifications (HTTP + WebSocket + Auto-trigger) | 9 | D/E/F passed |
| I | Statistics & Leaderboard | 6 | D/E/F passed |
| J | Cross-cutting & Negative tests | 8 | All above |

**Mỗi test case format:**

```
[GROUP-NN] <Tên ngắn>
Pre-condition: <state cần thiết>
Steps:
  1. ...
  2. ...
Expected:
  - ...
Status: [ ] Pass  [ ] Fail  [ ] Skip
Notes: __________
```

---

## 4. Chi tiết Test Cases

### A. Authentication & Session (10 cases)

**[A-01] Register user mới — happy path**
- Steps: Mở `/vi/register` → nhập `tester1 / tester1@x.com / test1234` → submit.
- Expected: redirect `/vi/dashboard`, có token trong localStorage, navbar hiển thị username.

**[A-02] Register — username/email trùng**
- Steps: Register lại cùng username.
- Expected: HTTP 400, FE hiển thị error message rõ ràng (không stack trace).

**[A-03] Login local — happy path**
- Steps: Logout → `/vi/login` → `admin / admin`.
- Expected: redirect `/vi/dashboard`, `access_token` trong localStorage.

**[A-04] Login sai mật khẩu**
- Steps: `admin / wrong`.
- Expected: HTTP 401, FE hiển thị "Sai thông tin đăng nhập".

**[A-05] Rate limit login**
- Steps: 10 lần login sai liên tiếp.
- Expected: từ lần thứ 6+ trả 429. Sau **5 phút** kể từ lần fail đầu tiên (TTL cố định `DEFAULT_LOGIN_FAILURE_TTL_SECONDS=300s`), counter tự expire → login lại được. Lưu ý: TTL không reset khi thử login bị ban (fixed window, sau F37). Nếu muốn 1 phút cần đổi config TTL trước khi test.

**[A-06] JWT auto-refresh**
- Steps: Login → giữ tab 16 phút (access_ttl=15m) → thực hiện action gọi API (vd. mở `/vi/courses`).
- Expected: Request 401 → interceptor refresh token → request retry thành công, không bị redirect login.

**[A-07] Logout single session**
- Steps: Login admin → `/vi/profile/sessions` → revoke current session.
- Expected: redirect `/vi/login`, localStorage xóa.

**[A-08] Logout all sessions**
- Steps: Login admin ở 2 browser (Chrome + Edge) → ở Chrome bấm "Đăng xuất tất cả".
- Expected: cả 2 browser, lần request kế tiếp đều 401 → redirect login.

**[A-09] Password change — force logout**
- Steps: `/vi/profile/settings` → change password → submit.
- Expected: tất cả session khác bị revoke (session hiện tại có thể giữ hoặc force logout — verify theo BE behavior).

**[A-10] Admin login surface gating**
- Steps: Login member1 → mở `/vi/admin/dashboard`.
- Expected: bị reject (`AdminAccessGate`) → redirect `/vi/admin/login` hoặc 403 page. (Verify F26 trong BUGS.md.)

---

### B. RBAC & Admin Users (8 cases)

**[B-01] List roles**
- Steps: admin → `/vi/admin/rbac` → bấm tab Roles.
- Expected: thấy 3 role `Admin`, `Editor`, `Member` (is_system=true).

**[B-02] Create custom role**
- Steps: tạo role `Trainer` + gán vài permission Learn.
- Expected: role xuất hiện, không phải is_system.

**[B-03] Assign role tới user**
- Steps: `/vi/admin/rbac/users/[member1-id]/roles` → thêm `Trainer`.
- Expected: list user roles update, JWT của member1 (sau login lại) chứa permission mới.

**[B-04] List users + search/filter**
- Steps: `/vi/admin/users` → search "editor".
- Expected: chỉ hiển thị editor1.

**[B-05] Activate/Deactivate user**
- Steps: deactivate editor1 → thử login editor1.
- Expected: login 401/403; activate lại → login OK.

**[B-06] Permission auto-discovery**
- Steps: Restart BE → mở Django shell hoặc `/api/admin/permissions/` → liệt kê permission.
- Expected: số permission khớp số `@register_permission` decorator trong code (xem `auth_app/services/permission_discovery.py`).

**[B-07] JWT bitmap claim**
- Steps: Login admin → decode token tại jwt.io → kiểm field `permissions` và `pv`.
- Expected: `permissions` là base64 string ~32 byte, `pv` là số version.

**[B-08] Permission revocation invalidates JWT**
- Steps: Login member1 → tạo course (sẽ 403 trong Pass 2) → admin gán role Editor → member1 logout/login lại → tạo course OK.
- Expected: việc thay role yêu cầu login lại để cập nhật claim (pv tăng).

---

### C. System Config Admin (6 cases)

**[C-01] List grouped config**
- Steps: admin → `/vi/admin/config`.
- Expected: accordion theo group (auth, learn, challenge, quiz, system, …). Secret key (vd `auth.sso_client_secret`) hiển thị mask `***`.

**[C-02] Update string key**
- Steps: đổi `system.site_name` → "ILS Test".
- Expected: save 200, refresh page giá trị giữ nguyên.

**[C-03] Update bool key (auth.authorization_enabled)**
- Steps: toggle on/off.
- Expected: save 200, log out + log in admin → JWT claim phản ánh đúng.

**[C-04] Type validation**
- Steps: thử nhập chuỗi vào key `auth.token.access_ttl` (int).
- Expected: BE trả 400 với message validation, FE highlight field.

**[C-05] Enum validation**
- Steps: nhập value không hợp lệ vào key có enum (vd `system.default_locale` → "fr").
- Expected: 400 + danh sách enum valid trong message.

**[C-06] Maintenance mode**
- Steps: set `system.maintenance_mode=true` → member1 mở `/vi/courses`.
- Expected: trả 503 (non-admin); admin vẫn truy cập được. Đặt lại false sau test.

---

### D. Learn — Course / Lesson / Progress (14 cases)

**[D-01] Create course (editor1)**
- Steps: editor1 → `/vi/admin/learn/courses/new` → nhập title/slug/description → save.
- Expected: redirect detail page, status = draft, slug unique.

**[D-02] Slug conflict**
- Steps: tạo course thứ 2 cùng slug.
- Expected: 409, FE hiển thị "Slug đã tồn tại".

**[D-03] Add tree nodes (folder + lesson)**
- Steps: editor1 → editor course → thêm folder "Section 1" → trong đó thêm lesson "Intro".
- Expected: `path` field set đúng (vd `1.2.3`), parent/child quan hệ OK.

**[D-04] Move node**
- Steps: kéo lesson sang folder khác.
- Expected: `path` của lesson + descendants cập nhật atomic; không loop tree.

**[D-05] Publish course**
- Steps: đổi status `draft → published`.
- Expected: member1 (chưa từng publish trước đó) giờ thấy course tại `/vi/courses`.

**[D-06] Member sees only published**
- Steps: tạo 1 course draft + 1 published → member1 vào `/vi/courses`.
- Expected: chỉ thấy course published.

**[D-07] View lesson (markdown content)**
- Steps: member1 mở lesson "Intro".
- Expected: render content (markdown), nút prev/next điều hướng đúng theo tree order.

**[D-08] Start lesson progress**
- Steps: lesson opens → backend nhận `POST .../progress/start`.
- Expected: response 200, idempotent (mở lại không tạo duplicate).

**[D-09] Complete lesson**
- Steps: bấm "Hoàn thành".
- Expected: 200, button disabled, course progress % tăng. Verify `completedLessonIds` được set (F35).

**[D-10] Course progress aggregate**
- Steps: hoàn thành 3/5 lesson → mở `/vi/courses/[slug]`.
- Expected: progress bar = 60%, hiển thị "3 / 5 lesson".

**[D-11] Miniquiz trong lesson**
- Steps: editor1 thêm câu hỏi miniquiz vào lesson → member1 trả lời.
- Expected: answer được chấm, không ảnh hưởng quiz progress riêng.

**[D-12] Archive course**
- Steps: editor1 archive course.
- Expected: ẩn khỏi catalog member; admin vẫn thấy ở filter "Archived".

**[D-13] Purge course**
- Steps: archive → purge.
- Expected: hard delete, không truy cập được nữa (404).

**[D-14] Max tree depth**
- Steps: set `learn.max_tree_depth=3` → tạo lesson ở depth 4.
- Expected: 400, message "Vượt quá độ sâu cây tối đa".

---

### E. Challenge — CTF & Flag Submit (12 cases)

**[E-01] Create challenge (editor1)**
- Steps: editor1 → `/vi/admin/challenges/new` → save.
- Expected: redirect detail, status draft.

**[E-02] Add STATIC flag**
- Steps: editor1 → tab Flags → thêm flag `ILS{hello_world}` type STATIC.
- Expected: lưu OK, value mask cho non-admin.

**[E-03] Add REGEX flag**
- Steps: thêm flag `^ILS\{regex_\d+\}$` type REGEX.
- Expected: lưu OK.

**[E-04] Member submit flag — correct STATIC**
- Steps: publish challenge → member1 mở detail → submit `ILS{hello_world}`.
- Expected: response `{correct: true}`, FE hiển thị "Đúng!", progress update.

**[E-05] Member submit flag — wrong**
- Steps: submit `ILS{wrong}`.
- Expected: `{correct: false}`, không tăng score.

**[E-06] Member submit flag — REGEX match**
- Steps: submit `ILS{regex_42}`.
- Expected: `{correct: true}`.

**[E-07] Flag value KHÔNG lộ cho member**
- Steps: member1 GET `/api/challenge/challenges/[slug]/flags/`.
- Expected: trả về flag metadata (id, type, points) nhưng `flag_value` = null / masked. **Security critical.**

**[E-08] Member sees only published**
- Steps: editor1 archive challenge → member1 reload catalog.
- Expected: challenge biến mất khỏi `/vi/challenges`.

**[E-09] Tree nodes (cycle-safe)**
- Steps: tạo cây node challenge → cố move parent → con (loop).
- Expected: 400, không corrupt path.

**[E-10] Challenge progress aggregate**
- Steps: member1 solve 2/3 challenge → GET `/api/challenge/progress/`.
- Expected: total_solved=2, total_points = sum của 2 challenge.

**[E-11] Instance start/stop (MockDeploymentBackend)**
- Steps: editor1 đặt `challenge.deploy.enabled=true` tạm thời → member1 bấm "Start Instance" trên challenge có `instance_type`.
- Expected: status=running, có endpoint URL mock. Bấm stop → status=stopped.

**[E-12] Instance partial unique (1 running/user/challenge)**
- Steps: start instance lần 2 khi chưa stop lần 1.
- Expected: 400 hoặc trả lại instance hiện tại, không tạo duplicate.

---

### F. Quiz — HTTP CRUD + WebSocket Session (13 cases)

**Bắt buộc:** Backend chạy bằng **Daphne** (mode B).

**[F-01] Create quiz (editor1)**
- Steps: `/vi/admin/quizzes/new` → tạo quiz "Test Quiz" → save.
- Expected: redirect detail, status draft.

**[F-02] Add 3 question types**
- Steps: thêm 1 single_choice + 1 multi_choice + 1 fill_blank.
- Expected: tất cả lưu OK, reorder bằng drag-drop.

**[F-03] Publish quiz**
- Steps: editor1 publish.
- Expected: member1 thấy ở `/vi/quizzes`.

**[F-04] Empty quiz finishes immediately** (regression F28)
- Steps: tạo quiz published không có câu hỏi → member1 start session.
- Expected: WS connect → auth → ngay lập tức nhận `finish` với 0/0.

**[F-05] WebSocket auth — happy path**
- Steps: member1 mở `/vi/quizzes/[id]/session` → click Start.
- Expected: console: WS connect → send `{type: auth, token}` → nhận `auth_ok` → nhận question đầu.

**[F-06] WebSocket auth — invalid token**
- Steps: sửa localStorage token thành rác → reload session.
- Expected: WS close code 4001 hoặc 4011, FE hiển thị "Phiên không hợp lệ, đăng nhập lại".

**[F-07] Answer single_choice — correct**
- Steps: chọn đáp án đúng → submit.
- Expected: server trả `answer_result {correct: true, score++}`, sau đó `question` tiếp theo hoặc `finish`.

**[F-08] Answer multi_choice — partial**
- Steps: tick 1 trong 2 đáp án đúng.
- Expected: theo logic chấm (full match required theo BE), `correct=false`.

**[F-09] Answer fill_blank — case sensitive theo config**
- Steps: nhập chuỗi đúng nhưng khác case.
- Expected: match theo config `quiz.fill_blank.case_sensitive` (verify behavior).

**[F-10] Finish flow + progress signal**
- Steps: hoàn tất session.
- Expected: server gửi `finish {score, total}`. Verify `UserQuizProgress` cập nhật (kiểm tại `/api/quiz/progress/` hoặc Django admin).

**[F-11] Quiz config: random_question=true**
- Steps: editor1 bật `random_question` → 2 member start session liên tiếp.
- Expected: thứ tự câu hỏi khác nhau giữa 2 session.

**[F-12] Reconnect mid-session**
- Steps: đang làm câu 2 → refresh tab.
- Expected: theo BE behavior — hoặc resume session hoặc reset (verify với expected design).

**[F-13] Filter questions by status**
- Steps: editor1 tạo question status=draft + published → list bằng filter.
- Expected: filter work (lưu ý L2 bug: thiếu composite index — kiểm tra performance không sai kết quả).

---

### G. User Profile & Sessions (7 cases)

**[G-01] View own profile**
- Steps: member1 → `/vi/profile`.
- Expected: hiển thị username, email, role badge, stats (course/challenge/quiz solved).

**[G-02] View public profile**
- Steps: admin mở `/vi/profile/member1`.
- Expected: 200, không lộ email (theo config privacy).

**[G-03] Edit profile settings**
- Steps: `/vi/profile/settings` → đổi display name/locale → save.
- Expected: lưu OK, UI cập nhật ngay.

**[G-04] Change password — verify A-09 already**
- (skip — covered).

**[G-05] List sessions với device info**
- Steps: `/vi/profile/sessions`.
- Expected: hiển thị tất cả session active, current session highlighted, có user_agent + last_seen.

**[G-06] Revoke single session**
- Steps: revoke session khác (không phải current).
- Expected: 204, session đó biến mất khỏi list. Verify browser khác (nếu đang dùng) bị logout request tiếp theo.

**[G-07] Privacy — public profile cho user không tồn tại**
- Steps: GET `/api/users/nobody/profile/`.
- Expected: 404 với schema error chuẩn.

---

### H. Notifications (9 cases)

**Bắt buộc:** Daphne mode.

**[H-01] WebSocket connect — auth**
- Steps: member1 login → mở bất kỳ trang authenticated.
- Expected: console show WS `/ws/notifications/` connected, gửi auth, nhận `auth_ok`.

**[H-02] Bell badge unread count**
- Steps: kiểm tra `useNotificationSocket` ở navbar.
- Expected: badge hiển thị số đúng so với `/api/notifications/unread-count/`.

**[H-03] Auto-trigger: course completion**
- Steps: member1 hoàn thành lesson cuối của 1 course.
- Expected: nhận notification realtime tại navbar trong vòng <2s. Inbox `/vi/notifications` có item mới.

**[H-04] Auto-trigger: challenge solve**
- Steps: member1 submit đúng flag mới.
- Expected: notification realtime.

**[H-05] Auto-trigger: quiz finish high score**
- Steps: member1 đạt điểm cao (theo threshold trong config nếu có).
- Expected: notification nếu BE bật.

**[H-06] Mark single as read**
- Steps: bấm 1 item trong inbox.
- Expected: unread badge giảm 1, item style thay đổi.

**[H-07] Mark all as read**
- Steps: bấm "Mark all read".
- Expected: badge về 0, refresh page giữ trạng thái.

**[H-08] Admin broadcast**
- Steps: admin → `/vi/admin/notifications` → soạn message + send to "All members".
- Expected: 200; member1 + editor1 nhận realtime; history table hiển thị broadcast.

**[H-09] i18n placeholder safety** (regression F29, F30, F33)
- Steps: kiểm broadcast với content chứa `{` `}`.
- Expected: không crash, hiển thị literal hoặc escape đúng.

---

### I. Statistics & Leaderboard (6 cases)

**[I-01] Leaderboard overall tab**
- Steps: member1 mở `/vi/leaderboard`.
- Expected: bảng xếp hạng theo total_score, my_rank highlight nếu user có điểm.

**[I-02] Leaderboard challenge/quiz/course tabs**
- Steps: switch tab.
- Expected: rank thay đổi theo tab (dense-rank theo từng category).

**[I-03] Pagination**
- Steps: tạo >25 user có điểm → kiểm pagination.
- Expected: nút next/prev work, page param trong URL.

**[I-04] Admin stats summary**
- Steps: admin → `/vi/admin/statistics` hoặc dashboard.
- Expected: tổng user, active_today, solves_week hiển thị, số khớp DB.

**[I-05] Admin per-user stats**
- Steps: admin → user detail page.
- Expected: course/challenge/quiz progress của user đó.

**[I-06] Empty state**
- Steps: reset DB → mở leaderboard không có user nào solve.
- Expected: empty state UI, không crash.

---

### J. Cross-cutting & Negative tests (8 cases)

**[J-01] 401 interceptor flow**
- Steps: localStorage xóa access_token → mở `/vi/courses`.
- Expected: redirect `/vi/login` không crash.

**[J-02] 403 unified dialog (L5 long-term goal)**
- Steps: Pass 2 — member1 cố GET `/api/admin/users/`.
- Expected: 403 với schema error chuẩn; FE hiển thị dialog "Không có quyền" (theo current guard hoặc redirect).

**[J-03] Locale switching**
- Steps: vi → en switch tại header.
- Expected: tất cả text đổi ngôn ngữ; URL `/vi/*` → `/en/*`; không mất state.

**[J-04] Deep link khi chưa login**
- Steps: mở `/vi/courses/[slug]` ở incognito.
- Expected: redirect login, sau login redirect lại deep link.

**[J-05] Concurrent updates (last-write-wins)**
- Steps: 2 tab cùng edit 1 course → save lệch nhau.
- Expected: không corrupt; ai save sau ghi đè (verify expected behavior).

**[J-06] Large payload**
- Steps: tạo lesson với markdown ~100KB.
- Expected: lưu OK, render không hang.

**[J-07] Pass 2 transition — RBAC enforced**
- Steps: Set `auth.authorization_enabled=true` → log out + log in tất cả user → chạy lại smoke flow.
- Expected: admin/editor/member chỉ thực hiện được action đúng theo role. Editor không sửa được system_config; Member không tạo được course.

**[J-08] Performance smoke**
- Steps: mở DevTools Network tab → page load `/vi/dashboard`.
- Expected: total < 3s, không request 500, không waterfall quá sâu.

---

## 5. Critical Files cần biết khi debug

| File | Mục đích |
|------|----------|
| `backend/api/management/commands/seed_admin.py` | Bootstrap admin user (password mặc định `admin`) |
| `backend/api/management/commands/seed_config.py` | Seed system_config defaults |
| `backend/api/management/commands/seed_roles.py` | Seed 3 builtin roles |
| `backend/backend/settings.py:174–191` | JWT lifetime, algorithm |
| `backend/backend/settings.py:206–209` | Channel layer (InMemory) |
| `backend/auth_app/services/permission_discovery.py` | Auto-discover permissions tại startup |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` |
| `frontend/src/lib/axios.ts:20–31` | Token attach + 401 interceptor |
| `frontend/src/hooks/useQuizSession.ts` | WS quiz client (state reducer) |
| `frontend/src/hooks/useNotificationSocket.ts` | WS notification client |
| `frontend/src/components/layouts/AdminAccessGate.tsx` | Admin surface guard |
| `docs/API.md` | Endpoint reference theo maturity |
| `docs/BUGS.md` | Known bug (L1–L5 active, F26+ recent fixes) |
| `docs/STATUS.md` | Slice nào done/partial/deferred |

---

## 6. Quy trình ghi nhận kết quả

**Tạo file report khi xong:**

Lưu tại `docs/reports/2026-05-28_integration-manual-test.md` theo template trong `CLAUDE.md` §"Session Completion — Report Requirement". Cấu trúc:

```markdown
# Session Report: Integration Manual Test Pass 1 + Pass 2

**Date:** 2026-05-28
**Slices / Areas:** Slice 0–9, 11 — end-to-end manual verification

## Summary
<1 đoạn — tổng số case, pass/fail/skip, bug mới phát hiện>

## Completed Items
- [x] Setup môi trường + seed DB
- [x] Pass 1 (authorization bypass) — A..J
- [x] Pass 2 (authorization enforced) — replay smoke

## Failed / Bug mới
| Case | Mô tả | Severity | File nghi vấn |
|------|-------|----------|---------------|
| ...  | ...   | ...      | ...           |

## Files Changed
(thường là `docs/BUGS.md` nếu thêm bug mới)
```

**Sau report:**
1. Cập nhật `docs/BUGS.md` với bug mới phát hiện (H/M/L theo severity).
2. Cập nhật `docs/STATUS.md` đánh dấu "Integration test pass 2026-05-28" nếu pass đa số.
3. Lưu memory qua OpenMemory MCP nếu có pattern hoặc decision đáng nhớ (theo `CLAUDE.md` §"Memory Update").

---

## 7. Verification — Cách xác nhận test hoàn tất

1. **Pass 1 (authorization bypass):** ≥90% case ở nhóm A–I pass; <5 bug mới H/M.
2. **Pass 2 (authorization enforced):** smoke replay (A-03, A-10, B-08, D-01 với member, E-04, F-05, J-02, J-07) đều đúng theo expected gating.
3. **WebSocket coverage:** F-05, H-01, H-03 đều connect + nhận message thành công.
4. **No regression:** các bug đã fix F26–F35 (xem `docs/BUGS.md:39–49`) không xuất hiện lại.
5. **Report file** đã commit vào `docs/reports/`.

Nếu coverage < 90% hoặc có bug High → tạo task fix trong `docs/STATUS.md` trước khi đóng đợt test.
