# UI Test Checklist — Slice 8: Profile, Session Management & Admin Users

> Môi trường: Frontend chạy với MSW mock data (không cần backend thật).
> Base URL: `http://localhost:4000`
> Locale mặc định test: `/vi` (có thể lặp lại với `/en` để kiểm tra i18n).
> Tài khoản mock mặc định khi đăng nhập: **member1 / (bất kỳ password ≥ 8 ký tự, trừ "wrong")**

---

## Mock Data Reference

> Hiểu rõ fixture trước khi test để biết kết quả đúng là gì.

### Người dùng (usersFixture — 10 bản ghi)

| ID | Username | Email | Role | is_staff | is_superuser | is_active |
|----|----------|-------|------|----------|--------------|-----------|
| 1 | member1 | member1@ils.local | **Admin** | true | true | true |
| 2 | member2 | member2@ils.local | **Editor** | true | false | true |
| 3–10 | member3–10 | member3–10@ils.local | **Member** | false | false | true |

### Profile (profileFixture — của member1)

| Trường | Giá trị |
|--------|---------|
| display_name | Core Admin |
| avatar_url | https://images.example.com/avatar-admin.png |
| bio | Platform operator |
| location | Hanoi |
| website | https://ils.local |
| entry_year | 2024 |
| language | vi |
| theme | system |
| timezone | Asia/Ho_Chi_Minh |
| total_learning_point | **350** |
| total_challenge_point | **420** |
| total_quiz_point | **180** |
| course_completed | **6** |
| challenge_completed | **11** |
| quiz_completed | **8** |

### Activity (activityFixture — 10 sự kiện)

| # | Loại | Timestamp | Tiêu đề |
|---|------|-----------|---------|
| 1 | lesson_complete | 2026-04-09T08:00Z | Injection Basics |
| 2 | challenge_solve | 2026-04-08T15:30Z | XSS Lab |
| 3 | quiz_complete | 2026-04-07T10:00Z | OWASP Basics Quiz |
| 4 | lesson_complete | 2026-04-06T09:00Z | Broken Access Control |
| 5 | challenge_solve | 2026-04-05T14:00Z | SQLi Lab |
| 6 | quiz_complete | 2026-04-04T11:00Z | Networking Essentials |
| 7 | lesson_complete | 2026-04-03T08:30Z | Secure Coding Checklist |
| 8 | challenge_solve | 2026-04-02T16:00Z | JWT Pwn |
| 9 | quiz_complete | 2026-04-01T13:00Z | Crypto Warmup |
| 10 | lesson_complete | 2026-03-31T09:00Z | Network Basics Intro |

### Sessions (authSessionsFixture — của member1 sau khi seeded)

> Session IDs được seeded theo công thức: `userId * 1000 + sessionId`. Với member1 (id=1):

| ID thực | device_info | last_used_at | expires_at | Trạng thái |
|---------|-------------|--------------|------------|------------|
| **1101** | Chrome on Windows | 2026-04-13T08:30Z | 2026-04-20T08:30Z | **CURRENT** (mới nhất) |
| **1102** | Safari on iPhone | 2026-04-12T20:15Z | 2026-04-19T20:15Z | Active |
| **1103** | Firefox on Linux | 2026-04-11T09:45Z | 2026-04-18T09:45Z | Active |

> **Xác định current session:** Sort theo `last_used_at` DESC → session 1101 (Chrome on Windows) là current.

### Admin Users (adminUsersFixture — 10 bản ghi)

| ID | Username | Role | last_login | date_joined |
|----|----------|------|------------|-------------|
| 1 | member1 | Admin | 2026-04-09 | 2026-01-10 |
| 2 | member2 | Editor | 2026-04-09 | 2026-01-10 |
| 3–5 | member3–5 | Member | 2026-04-09 | 2026-01-10 |
| 6–10 | member6–10 | Member | null | 2026-01-10 |

> Tất cả `is_active = true` trong fixture ban đầu.

---

## PHẦN A — Public Profile (`/vi/profile/[username]`)

**Route:** `/vi/profile/member1`

### A-1 · Tải trang và hiển thị thông tin cơ bản

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-1-1 | Truy cập `/vi/profile/member1` | Trang tải thành công, không lỗi 404 |
| A-1-2 | Quan sát khi đang tải | Skeleton loading hiển thị (avatar + stat cards) trong thời gian fetch |
| A-1-3 | Quan sát avatar | Avatar hiển thị ảnh từ URL `https://images.example.com/avatar-admin.png` |
| A-1-4 | Quan sát display name | "Core Admin" hiển thị nổi bật |
| A-1-5 | Quan sát username | "@member1" hiển thị bên dưới display name |
| A-1-6 | Quan sát bio | "Platform operator" hiển thị |
| A-1-7 | Quan sát location | "Hanoi" hiển thị (với icon location) |
| A-1-8 | Quan sát website | "https://ils.local" hiển thị dạng link có thể click |
| A-1-9 | Click vào link website | Mở link trong tab mới |
| A-1-10 | Quan sát entry year | "2024" hiển thị (năm nhập học) |

### A-2 · Stats Cards (6 thống kê)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-2-1 | Quan sát card Learning Points | Hiển thị giá trị **350** |
| A-2-2 | Quan sát card Challenge Points | Hiển thị giá trị **420** |
| A-2-3 | Quan sát card Quiz Points | Hiển thị giá trị **180** |
| A-2-4 | Quan sát card Courses Completed | Hiển thị giá trị **6** |
| A-2-5 | Quan sát card Challenges Completed | Hiển thị giá trị **11** |
| A-2-6 | Quan sát card Quizzes Completed | Hiển thị giá trị **8** |
| A-2-7 | Resize màn hình xuống mobile | Cards xuống 2 cột (sm: 2-col) |
| A-2-8 | Resize màn hình lên desktop | Cards hiển thị 3 cột (lg: 3-col) |

### A-3 · Activity Timeline

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-3-1 | Quan sát section Activity | Hiển thị tiêu đề "Hoạt động gần đây" (hoặc i18n tương đương) |
| A-3-2 | Đếm số sự kiện hiển thị | **10 sự kiện** hiển thị (đúng với activityFixture) |
| A-3-3 | Quan sát sự kiện #1 | "Injection Basics" · icon bài học · thời gian tương đối |
| A-3-4 | Quan sát sự kiện #2 | "XSS Lab" · icon challenge (🚩) |
| A-3-5 | Quan sát sự kiện #3 | "OWASP Basics Quiz" · icon quiz (✅) |
| A-3-6 | Kiểm tra thời gian tương đối | Sự kiện 2026-04-09 hiển thị khoảng "4 ngày trước" (tính từ 2026-04-13) |
| A-3-7 | Quan sát sự kiện #10 | "Network Basics Intro" · icon bài học · "13 ngày trước" |

### A-4 · Xử lý lỗi & edge case

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| A-4-1 | Truy cập `/vi/profile/nonexistent` | Trang hiển thị thông báo "Không tìm thấy người dùng" (404 state) |
| A-4-2 | Truy cập `/vi/profile/member2` | Trang tải thành công với profile của member2 |
| A-4-3 | Truy cập `/en/profile/member1` | Trang tải thành công với labels tiếng Anh |

---

## PHẦN B — Profile Settings (`/vi/profile/settings`)

> Yêu cầu đã đăng nhập. Đăng nhập với member1 trước khi test.

### B-1 · Tải trang và dữ liệu ban đầu

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-1-1 | Truy cập `/vi/profile/settings` | Trang tải thành công (không redirect) |
| B-1-2 | Quan sát trạng thái loading | Skeleton placeholder hiển thị trong khi fetch `GET /api/users/me/profile/` |
| B-1-3 | Sau khi tải xong — form Profile Edit | display_name pre-filled = "Core Admin" |
| B-1-4 | Sau khi tải xong — form Profile Edit | bio pre-filled = "Platform operator" |
| B-1-5 | Sau khi tải xong — form Profile Edit | location pre-filled = "Hanoi" |
| B-1-6 | Sau khi tải xong — form Profile Edit | website pre-filled = "https://ils.local" |
| B-1-7 | Sau khi tải xong — form Profile Edit | entry_year pre-filled = 2024 |
| B-1-8 | Sau khi tải xong — form App Settings | language select = "Tiếng Việt" (vi) |
| B-1-9 | Sau khi tải xong — form App Settings | theme select = "Hệ thống" (system) |
| B-1-10 | Sau khi tải xong — form App Settings | timezone input = "Asia/Ho_Chi_Minh" |
| B-1-11 | Sau khi tải xong — form Account | username pre-filled = "member1" |

### B-2 · ProfileEditForm — Chỉnh sửa và lưu

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-2-1 | Xóa display_name, nhập "New Name", click Save | Button hiển thị "Đang lưu...", sau đó thông báo thành công |
| B-2-2 | Sau B-2-1 — reload trang | display_name vẫn là "New Name" (mock lưu được) |
| B-2-3 | Nhập entry_year = 1999 (nhỏ hơn 2000) | Validation hiển thị lỗi: năm phải ≥ 2000 |
| B-2-4 | Nhập entry_year = 2101 (lớn hơn 2100) | Validation hiển thị lỗi: năm phải ≤ 2100 |
| B-2-5 | Nhập entry_year = 2025 (hợp lệ), click Save | Lưu thành công |
| B-2-6 | Xóa bio, để trống, click Save | Lưu thành công (bio là optional) |
| B-2-7 | Nhập avatar_url = URL ảnh hợp lệ, click Save | Lưu thành công |
| B-2-8 | Xóa hết nội dung sau khi có thông báo lỗi/thành công | Thông báo biến mất khi bắt đầu chỉnh sửa |
| B-2-9 | Quan sát trạng thái button khi đang submit | Button disabled + text "Đang lưu..." |

### B-3 · AppSettingsForm — Cài đặt ngôn ngữ, theme, timezone

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-3-1 | Mở select Language | Hiển thị 2 tùy chọn: "Tiếng Việt" và "English" |
| B-3-2 | Chọn "English", click Save | Lưu thành công (thông báo xuất hiện) |
| B-3-3 | Mở select Theme | Hiển thị 3 tùy chọn: "Hệ thống", "Sáng", "Tối" |
| B-3-4 | Chọn "Tối", click Save | Lưu thành công |
| B-3-5 | Xóa timezone, nhập "UTC", click Save | Lưu thành công |
| B-3-6 | Xóa timezone, để trống, click Save | Hành vi lưu (timezone optional hoặc giữ nguyên) |

### B-4 · AccountForm — Đổi username/email

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-4-1 | Quan sát nút Save khi chưa thay đổi gì | Button Save **disabled** (phải thay đổi ít nhất 1 trường) |
| B-4-2 | Đổi username thành "member1_new", click Save | Lưu thành công, trả về User object |
| B-4-3 | Thử đổi username thành "member2" (đã tồn tại) | Hiển thị lỗi từ response: `{ username: ['...'] }` |
| B-4-4 | Nhập email mới "newemail@test.com" (không đổi username), click Save | Button Save enabled, lưu thành công |
| B-4-5 | Quan sát trạng thái button khi đang submit | Button disabled + loading state |

### B-5 · Session Management Card

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-5-1 | Tìm card "Quản lý phiên đăng nhập" (hoặc "Session Management") | Card hiển thị với mô tả và button/link |
| B-5-2 | Click vào button/link trong card | Điều hướng đến `/vi/profile/sessions` |

### B-6 · Sections bị tắt (deferred)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| B-6-1 | Tìm section "Đổi mật khẩu" | Hiển thị nhưng `opacity-60` hoặc disabled (pending Task 1.4) |
| B-6-2 | Tìm section "SSO Identity" | Hiển thị nhưng `opacity-60` hoặc disabled (deferred) |

---

## PHẦN C — Session Management (`/vi/profile/sessions`)

> Yêu cầu đã đăng nhập. Đăng nhập với member1 trước khi test.

### C-1 · Tải trang và hiển thị danh sách sessions

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-1-1 | Truy cập `/vi/profile/sessions` | Trang tải thành công |
| C-1-2 | Quan sát trong khi loading | Skeleton rows (khoảng 4 hàng) hiển thị |
| C-1-3 | Sau khi tải — đếm số session | **3 sessions** hiển thị trong bảng |
| C-1-4 | Kiểm tra cột Device của hàng 1 | "Chrome on Windows" |
| C-1-5 | Kiểm tra cột Device của hàng 2 | "Safari on iPhone" |
| C-1-6 | Kiểm tra cột Device của hàng 3 | "Firefox on Linux" |
| C-1-7 | Kiểm tra badge hàng 1 (Chrome) | Badge màu xanh lá "Current" (session hiện tại) |
| C-1-8 | Kiểm tra badge hàng 2, 3 | Badge màu xám "Active" |
| C-1-9 | Kiểm tra cột Last Used hàng 1 | Ngày gần nhất: 13 Apr 2026 08:30 (hoặc định dạng locale tương đương) |
| C-1-10 | Kiểm tra cột Expires hàng 1 | 20 Apr 2026 (hoặc định dạng locale tương đương) |
| C-1-11 | Kiểm tra cột Created hàng 3 (Firefox) | 8 Apr 2026 (created_at: 2026-04-08) |

### C-2 · Nút Revoke (từng session)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-2-1 | Quan sát nút Revoke của hàng 1 (Chrome — Current) | Nút **disabled** (không thể thu hồi current session) |
| C-2-2 | Quan sát nút Revoke của hàng 2 (Safari) | Nút **enabled** |
| C-2-3 | Quan sát nút Revoke của hàng 3 (Firefox) | Nút **enabled** |
| C-2-4 | Click Revoke trên hàng 2 (Safari) | Dialog xác nhận xuất hiện |
| C-2-5 | Trong dialog — kiểm tra tiêu đề | "Revoke Session?" (hoặc i18n tương đương) |
| C-2-6 | Trong dialog — kiểm tra nội dung | Tên thiết bị "Safari on iPhone" xuất hiện trong mô tả |
| C-2-7 | Trong dialog — click Cancel | Dialog đóng lại, không có gì thay đổi |
| C-2-8 | Click Revoke lần nữa (Safari), sau đó click Confirm | Button loading, sau đó: dialog đóng, bảng cập nhật còn 2 sessions |
| C-2-9 | Sau C-2-8 — kiểm tra thông báo | Banner thành công xuất hiện: "Phiên đã được thu hồi" (hoặc i18n key `sessions.success.revokeOne`) |
| C-2-10 | Sau C-2-8 — kiểm tra bảng | Chỉ còn Chrome on Windows và Firefox on Linux |

### C-3 · Nút "Revoke All Other Sessions"

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-3-1 | Quan sát nút "Revoke All Other Sessions" (trước khi revoke bất kỳ session nào) | Nút **enabled** (có 2 sessions khác ngoài current) |
| C-3-2 | Click nút "Revoke All Other Sessions" | Dialog xác nhận xuất hiện |
| C-3-3 | Trong dialog — kiểm tra tiêu đề | "Revoke All Other Sessions?" (hoặc i18n tương đương) |
| C-3-4 | Trong dialog — kiểm tra mô tả | Nhắc rằng tất cả sessions khác sẽ bị thu hồi |
| C-3-5 | Click Cancel | Dialog đóng, không thay đổi |
| C-3-6 | Mở dialog lại, click "Revoke All" | Button loading; sau đó dialog đóng, bảng còn lại 1 session (Current) |
| C-3-7 | Sau C-3-6 — thông báo thành công | Banner: "Tất cả phiên khác đã được thu hồi" (i18n `sessions.success.revokeAll`) |
| C-3-8 | Sau C-3-6 — kiểm tra nút Revoke All | Nút **disabled** (chỉ còn current session, không còn session khác) |

### C-4 · Edge case: Chỉ còn 1 session (sau khi revoke all)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-4-1 | Sau khi revoke all — kiểm tra bảng | Chỉ còn 1 hàng: "Chrome on Windows" với badge "Current" |
| C-4-2 | Nút Revoke của hàng duy nhất | **Disabled** (là current session) |
| C-4-3 | Nút "Revoke All Other Sessions" | **Disabled** (không còn session khác) |

### C-5 · Trạng thái Loading và Empty

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| C-5-1 | Quan sát khi isMutating=true (đang submit) | Tất cả nút Revoke bị disable trong khi đang xử lý |
| C-5-2 | (Nếu mock trả về empty array) | Hiển thị thông báo "Không có phiên đăng nhập nào" |

---

## PHẦN D — Admin User Management (`/vi/admin/users`)

> Yêu cầu đăng nhập với tài khoản có quyền Admin (member1).
> Route admin: `/vi/admin/users`

### D-1 · Tải trang và bố cục chính

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-1-1 | Truy cập `/vi/admin/users` | Trang tải thành công, không bị redirect |
| D-1-2 | Quan sát tiêu đề trang | "Quản lý người dùng" (hoặc i18n `adminUsers.title`) |
| D-1-3 | Quan sát subtitle | Mô tả ngắn bên dưới tiêu đề |
| D-1-4 | Quan sát toolbar | Search input + Status filter dropdown + Refresh button hiển thị |
| D-1-5 | Quan sát nút tạo user | Button "Tạo người dùng" (hoặc "Create User") ở góc phải |
| D-1-6 | Quan sát loading state | Skeleton rows (5 hàng) hiển thị khi đang fetch |

### D-2 · Bảng danh sách người dùng

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-2-1 | Đếm số hàng trong bảng | **10 users** hiển thị (tất cả adminUsersFixture) |
| D-2-2 | Kiểm tra hàng member1 — cột Username | "member1" |
| D-2-3 | Kiểm tra hàng member1 — cột Email | "member1@ils.local" |
| D-2-4 | Kiểm tra hàng member1 — cột Roles | Badge "Admin" |
| D-2-5 | Kiểm tra hàng member2 — cột Roles | Badge "Editor" |
| D-2-6 | Kiểm tra hàng member3 — cột Roles | Badge "Member" |
| D-2-7 | Kiểm tra hàng member1 — cột Status | Badge xanh lá "Active" |
| D-2-8 | Kiểm tra cột Date Joined (tất cả) | "10 Jan 2026" (hoặc định dạng locale tương đương) |
| D-2-9 | Quan sát cột Actions | Mỗi hàng có link "Manage Roles" và button Activate/Deactivate |

### D-3 · Actions Column

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-3-1 | Click "Manage Roles" của member1 | Điều hướng đến `/vi/admin/rbac/users/1/roles` |
| D-3-2 | Click "Manage Roles" của member3 | Điều hướng đến `/vi/admin/rbac/users/3/roles` |
| D-3-3 | Quan sát button của user Active | Button style "outline" / "Deactivate" |
| D-3-4 | Quan sát button của user Inactive (nếu có) | Button style mặc định / "Activate" |

### D-4 · Deactivate User (xác nhận)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-4-1 | Click button "Deactivate" của member3 | Dialog xác nhận xuất hiện |
| D-4-2 | Trong dialog — kiểm tra tiêu đề | "Deactivate User?" (i18n tương đương) |
| D-4-3 | Trong dialog — kiểm tra mô tả | Tên "member3" xuất hiện trong nội dung |
| D-4-4 | Trong dialog — click Cancel | Dialog đóng, member3 vẫn Active |
| D-4-5 | Mở dialog lại, click Confirm | Button loading → dialog đóng → bảng cập nhật |
| D-4-6 | Sau D-4-5 — kiểm tra member3 trong bảng | Status badge chuyển sang "Inactive" (xám) |
| D-4-7 | Sau D-4-5 — kiểm tra button của member3 | Button đổi thành "Activate" |
| D-4-8 | Click "Activate" của member3 | **Không có dialog** — toggle trực tiếp; bảng cập nhật status → Active |

### D-5 · Search (client-side)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-5-1 | Nhập "member1" vào search box | Bảng filter còn 1 hàng: member1 |
| D-5-2 | Nhập "member" vào search box | Bảng filter còn tất cả 10 hàng (tất cả username chứa "member") |
| D-5-3 | Nhập "@ils.local" vào search box | Bảng filter còn tất cả 10 hàng (tất cả email chứa "@ils.local") |
| D-5-4 | Nhập "xyz_notexist" vào search box | Bảng hiển thị empty state: "Không tìm thấy kết quả" (hoặc i18n tương đương) |
| D-5-5 | Xóa hết nội dung search | Bảng hiển thị lại tất cả 10 users |
| D-5-6 | Nhập "member1" → quan sát pagination | Search là client-side — không re-fetch |

### D-6 · Status Filter (server-side)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-6-1 | Mở dropdown filter, chọn "Active" | API được gọi lại với `is_active=true`; bảng hiển thị 10 users (tất cả active) |
| D-6-2 | Mở dropdown filter, chọn "Inactive" | API được gọi lại với `is_active=false`; bảng hiển thị **0 users** (không ai inactive ban đầu) |
| D-6-3 | Sau D-4-5 (đã deactivate member3), chọn "Inactive" | Bảng hiển thị **1 user**: member3 |
| D-6-4 | Mở dropdown filter, chọn "All" | API được gọi không có filter; bảng hiển thị tất cả |
| D-6-5 | Sau khi đổi filter — kiểm tra pagination | Pagination reset về trang 1 |

### D-7 · Refresh Button

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-7-1 | Click nút Refresh | API re-fetch với filter hiện tại; dữ liệu cập nhật |
| D-7-2 | Trong khi refresh — quan sát trạng thái | Button hiển thị "Đang tải..." hoặc disabled |

### D-8 · Pagination

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-8-1 | Quan sát thông tin phân trang | "Total: 10 users", "Page 1 of 1" (10 user, limit=20 → 1 trang) |
| D-8-2 | Quan sát nút Previous | **Disabled** (đang ở trang 1) |
| D-8-3 | Quan sát nút Next | **Disabled** (chỉ có 1 trang) |
| D-8-4 | (Nếu có >20 users sau khi tạo thêm) Click Next | Tải trang 2 với offset=20 |

### D-9 · Create User Dialog

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-9-1 | Click nút "Tạo người dùng" | Dialog "Create New User" xuất hiện |
| D-9-2 | Trong dialog — quan sát các field | username (required), email (optional), password (optional) |
| D-9-3 | Để username trống — quan sát nút Submit | Button **disabled** (username là required) |
| D-9-4 | Nhập username="testuser01", không nhập email/password, click Submit | Tạo thành công; dialog đóng; bảng cập nhật (11 users) |
| D-9-5 | Sau D-9-4 — kiểm tra user mới trong bảng | testuser01 xuất hiện với roles=Member (default), is_active=true |
| D-9-6 | Mở dialog lại, nhập username="testuser02", email="test@ils.local", password="password123", Submit | Tạo thành công; dialog đóng; bảng cập nhật |
| D-9-7 | Sau submit thành công — kiểm tra form | Form clear (username/email/password trống) |
| D-9-8 | Click Cancel hoặc đóng dialog | Dialog đóng, không tạo user |
| D-9-9 | Trong khi submit — quan sát button | Button loading + disabled |

### D-10 · Error States

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| D-10-1 | Quan sát khi bảng đang tải lần đầu | Skeleton rows hiển thị |
| D-10-2 | Tìm kiếm với kết quả rỗng | Empty state: "Không tìm thấy kết quả phù hợp" |
| D-10-3 | Filter "Inactive" khi chưa có user nào inactive | Empty state: "Không có người dùng" (hoặc tương đương) |

---

## PHẦN E — i18n & Locale

### E-1 · Kiểm tra locale `/en`

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-1-1 | Truy cập `/en/profile/member1` | Labels hiển thị tiếng Anh ("Learning Points", "Activity", v.v.) |
| E-1-2 | Truy cập `/en/profile/settings` | Labels tiếng Anh ("Display Name", "Save", "Saving...") |
| E-1-3 | Truy cập `/en/profile/sessions` | Labels tiếng Anh ("Current", "Active", "Revoke", "Revoke All Other Sessions") |
| E-1-4 | Truy cập `/en/admin/users` | Labels tiếng Anh ("User Management", "Search...", "Status") |

### E-2 · Định dạng ngày theo locale

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| E-2-1 | Trong `/vi/profile/sessions` — kiểm tra định dạng date | "13 Th04 2026" hoặc "13/04/2026" (vi-VN format) |
| E-2-2 | Trong `/en/profile/sessions` — kiểm tra định dạng date | "13 Apr 2026" hoặc "4/13/2026" (en-US format) |
| E-2-3 | Trong `/vi/admin/users` — kiểm tra date_joined | Format vi-VN |

---

## PHẦN F — Navigation & Integration

### F-1 · Luồng điều hướng liên kết giữa các trang

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-1-1 | Từ `/vi/profile/settings` — click link trong Session Management card | Điều hướng sang `/vi/profile/sessions` |
| F-1-2 | Từ `/vi/profile/sessions` — click Back (browser) | Quay về `/vi/profile/settings` |
| F-1-3 | Từ `/vi/admin/users` — click "Manage Roles" của member1 | Điều hướng đến `/vi/admin/rbac/users/1/roles` |
| F-1-4 | Truy cập `/vi/profile/sessions` khi chưa đăng nhập | Redirect về trang login |
| F-1-5 | Truy cập `/vi/admin/users` với tài khoản Member (không phải admin) | Redirect hoặc hiển thị lỗi 403 |

### F-2 · Khả năng phản hồi (Responsive)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| F-2-1 | Mở `/vi/profile/member1` trên mobile (< 640px) | Layout đơn cột, stats cards 2 cột |
| F-2-2 | Mở `/vi/admin/users` trên tablet | Bảng có horizontal scroll nếu không đủ không gian |
| F-2-3 | Mở dialog "Create User" trên mobile | Dialog hiển thị đúng, không bị cut off |

---

## PHẦN G — Luồng Test Tổng Hợp (End-to-End Scenarios)

### G-1 · Scenario: Xem public profile rồi vào settings

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-----------------|
| 1 | Đăng nhập với member1 | Login thành công |
| 2 | Truy cập `/vi/profile/member1` | Public profile hiển thị đầy đủ stats & activity |
| 3 | Từ navigation, tìm link đến settings | Link "Cài đặt" hoặc avatar dropdown → Settings |
| 4 | Truy cập `/vi/profile/settings` | Trang settings load, forms pre-filled |
| 5 | Cập nhật display_name → "My New Name" | Save thành công |
| 6 | Quay lại `/vi/profile/member1` | display_name mới "My New Name" hiển thị |

### G-2 · Scenario: Quản lý sessions — revoke từng phiên

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-----------------|
| 1 | Đăng nhập với member1 | Login thành công |
| 2 | Truy cập `/vi/profile/sessions` | 3 sessions hiển thị |
| 3 | Xác nhận current session là Chrome on Windows | Badge "Current" ở hàng 1 |
| 4 | Click Revoke → Safari on iPhone → Confirm | Safari bị remove; còn 2 sessions |
| 5 | Click Revoke → Firefox on Linux → Confirm | Firefox bị remove; còn 1 session (Current) |
| 6 | Quan sát nút Revoke All Other Sessions | Disabled (không còn session khác) |
| 7 | Quan sát nút Revoke của Chrome | Disabled (là current session) |

### G-3 · Scenario: Admin tạo và deactivate user

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-----------------|
| 1 | Đăng nhập với member1 (Admin) | Login thành công |
| 2 | Truy cập `/vi/admin/users` | 10 users hiển thị |
| 3 | Click "Tạo người dùng" | Dialog xuất hiện |
| 4 | Nhập username="newmember", click Submit | User mới tạo; bảng cập nhật 11 users; role=Member |
| 5 | Search "newmember" trong search box | Kết quả filter còn 1 hàng: newmember |
| 6 | Click Deactivate của newmember → Confirm | newmember status → Inactive |
| 7 | Xóa search, chọn filter "Inactive" | Bảng hiển thị 1 user: newmember |
| 8 | Click Activate của newmember | newmember status → Active |
| 9 | Chọn filter "All" | Bảng hiển thị lại 11 users, newmember Active |

### G-4 · Scenario: Revoke All trong session management

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|-----------------|
| 1 | Đăng nhập với member1 | Login thành công |
| 2 | Truy cập `/vi/profile/sessions` | 3 sessions hiển thị |
| 3 | Click "Revoke All Other Sessions" | Dialog xác nhận |
| 4 | Click Confirm | Cả 2 sessions (Safari + Firefox) bị revoke |
| 5 | Kiểm tra bảng | Chỉ còn 1 session: Chrome on Windows (Current) |
| 6 | Kiểm tra thông báo | Banner thành công: "Tất cả phiên khác đã được thu hồi" |
| 7 | Kiểm tra nút Revoke All | Disabled |

---

## Checklist Tổng Hợp (Quick Reference)

### Slice 8 — Tổng quan các trang cần test

| Trang | Route | Sections cần test | Ưu tiên |
|-------|-------|-------------------|---------|
| Public Profile | `/vi/profile/member1` | Header, Stats, Activity, 404 | Cao |
| Profile Settings | `/vi/profile/settings` | ProfileEditForm, AppSettingsForm, AccountForm, Session Card | Cao |
| Session Management | `/vi/profile/sessions` | List, Revoke One, Revoke All, Edge cases | Cao |
| Admin Users | `/vi/admin/users` | Table, Search, Filter, Deactivate, Create, Pagination | Cao |

### Kết quả cần ghi lại sau khi test

- [ ] PHẦN A (Public Profile): Tất cả testcase pass
- [ ] PHẦN B (Profile Settings): Tất cả form save/validate pass
- [ ] PHẦN C (Session Management): Revoke one + Revoke all pass; current session protected
- [ ] PHẦN D (Admin Users): CRUD + filter + search + pagination pass
- [ ] PHẦN E (i18n): `/en` locale labels hiển thị đúng
- [ ] PHẦN F (Navigation): Điều hướng giữa các trang pass
- [ ] PHẦN G (Scenarios): 4 luồng end-to-end pass
