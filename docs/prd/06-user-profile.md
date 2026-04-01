# PRD-06: User Profile

**Feature:** User Profile — Trang cá nhân và cài đặt
**Status:** Planned
**Priority:** Low-Medium

---

## Context

Mỗi người dùng có một trang cá nhân hiển thị thành tích (điểm, số bài hoàn thành) và hoạt động gần đây. Trang cài đặt cho phép điều chỉnh thông tin hiển thị, ngôn ngữ, theme. Dữ liệu thành tích được denormalize trong `user_profile` và sync qua Django signal. Thứ hạng của user được tính từ bảng xếp hạng.

---

## Problem

Không có trang cá nhân hay trang cài đặt. Người dùng không thể xem thành tích hoặc điều chỉnh thông tin. Dữ liệu điểm số nằm rải rác trong các bảng progress.

---

## Goal

1. Hiển thị trang cá nhân với thành tích, điểm số, và hoạt động gần đây.
2. Cho phép user chỉnh sửa thông tin profile (display name, bio, avatar, location).
3. Cài đặt ngôn ngữ, theme, timezone.
4. Hiển thị tóm tắt thứ hạng của user.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-PROF-01 | Member | Tôi muốn xem trang cá nhân của mình với điểm và thành tích. | High |
| US-PROF-02 | Member | Tôi muốn xem trang cá nhân của người dùng khác. | Medium |
| US-PROF-03 | Member | Tôi muốn cập nhật display name, bio, avatar URL. | High |
| US-PROF-04 | Member | Tôi muốn chọn ngôn ngữ hiển thị (vi/en). | Medium |
| US-PROF-05 | Member | Tôi muốn chọn theme (light/dark/system). | Low |
| US-PROF-06 | Member | Tôi muốn thay đổi email hoặc username. | Medium |
| US-PROF-07 | Member | Tôi muốn xem danh sách các phiên đăng nhập đang active. | Medium |
| US-PROF-08 | Admin | Tôi muốn xem và quản lý thông tin của bất kỳ user nào. | Medium |
| US-PROF-09 | Admin | Tôi muốn enable/disable user account. | Medium |

---

## Functional Requirements

### FR-PROF-01: Profile View (Public)
- GET profile theo `username`.
- Hiển thị: `display_name`, `bio`, `avatar_url`, `location`, `website`, `entry_year`.
- Thành tích: `total_learning_point`, `total_challenge_point`, `total_quiz_point`.
- Số hoàn thành: `course_completed`, `challenge_completed`, `quiz_completed`.
- Hoạt động gần đây: 5 challenge submits gần nhất, 5 lesson completes gần nhất.
- Không hiển thị thông tin nhạy cảm (email, sessions).

### FR-PROF-02: Profile Edit (Own)
- UPDATE `user_profile`: `display_name`, `bio`, `avatar_url`, `location`, `website`.
- Validate: `display_name` max 100 chars; `bio` max 500 chars; `avatar_url` valid URL format.

### FR-PROF-03: Account Settings
- UPDATE `user.email`: yêu cầu verify email mới (gửi confirmation link).
- UPDATE `user.username`: unique check.
- UPDATE `user_profile.language`, `theme`, `timezone`.

### FR-PROF-04: Points Sync
- `user_profile` denormalized counters được sync via Django signals:
  - `user_course_progress` saved with `completed_at` → tăng `course_completed`, cộng `learning_point`.
  - `user_challenge_progress` saved with `completed_at` → tăng `challenge_completed`, cộng `challenge_point`.
  - `user_quiz_progress` saved with `completed_at` → tăng `quiz_completed`, cộng `quiz_point`.
- Đảm bảo idempotent: chỉ cộng điểm khi chuyển từ null → có completed_at (lần đầu).

### FR-PROF-05: Activity Feed
- Endpoint trả về danh sách activities gần đây của user:
  - Type: `lesson_complete`, `challenge_solve`, `quiz_complete`.
  - Timestamp, item title.
- Limit 20 items, sorted by time desc.

### FR-PROF-06: Admin User Management
- Admin list users với filter (is_active, date range).
- Admin GET/PATCH user (is_active enable/disable).
- Admin không thể xóa user (chỉ disable).

### FR-PROF-07: last_active_at Update
- Middleware cập nhật `user_profile.last_active_at` khi user thực hiện authenticated request (debounce 1 giờ).

---

## Edge Cases

| Case | Handling |
|------|----------|
| Username change: tên mới đã tồn tại | Trả lỗi 400 với field error |
| Email change: email mới đã tồn tại | Trả lỗi 400 với field error |
| Avatar URL không accessible | Lưu URL nhưng không validate accessibility |
| user_profile không tồn tại (chưa tạo) | Auto-create khi user được tạo |
| Đọc profile user bị disabled | Trả 404 hoặc 403 tùy policy |
| Điểm bị double-count khi signal bắn 2 lần | Check current completed_at trước khi cộng (idempotent) |

---

## API / Data Structure

### Endpoints

```
# Public Profile
GET    /api/users/{username}/profile/         # Public profile view
GET    /api/users/{username}/activity/        # Recent activity

# Own Profile
GET    /api/users/me/profile/                 # My profile
PATCH  /api/users/me/profile/                 # Edit profile
PATCH  /api/users/me/settings/                # Language, theme, timezone
PATCH  /api/users/me/account/                 # Username, email change
GET    /api/users/me/sessions/                # Active sessions (from auth feature)

# Admin
GET    /api/admin/users/                      # List all users
GET    /api/admin/users/{id}/                 # User detail
PATCH  /api/admin/users/{id}/                 # Update user (is_active, etc.)
```

### Key DB Tables

```sql
-- user: id, username, email, first_name, last_name, is_active
-- user_profile: user_id, display_name, avatar_url, bio, location, website,
--               language, theme, timezone, entry_year,
--               total_learning_point, total_challenge_point, total_quiz_point,
--               course_completed, challenge_completed, quiz_completed,
--               last_active_at
```

### Public Profile Response

```json
{
  "username": "alice",
  "display_name": "Alice Nguyen",
  "bio": "Cybersecurity enthusiast",
  "avatar_url": "https://example.com/avatar.png",
  "location": "Hanoi, Vietnam",
  "website": "https://alice.dev",
  "entry_year": 2023,
  "stats": {
    "total_learning_point": 500,
    "total_challenge_point": 1200,
    "total_quiz_point": 300,
    "course_completed": 3,
    "challenge_completed": 15,
    "quiz_completed": 8
  },
  "last_active_at": "2026-03-09T08:00:00Z"
}
```

### Profile Edit Request

```json
{
  "display_name": "Alice N.",
  "bio": "Learning security every day",
  "avatar_url": "https://example.com/new-avatar.png",
  "location": "Ho Chi Minh City"
}
```

---

## Acceptance Criteria

### AC-PROF-01: View Own Profile
```
Given: alice đã đăng nhập
When: GET /api/users/me/profile/
Then: Response 200 với đầy đủ thông tin profile và stats
```

### AC-PROF-02: Edit Profile
```
Given: alice đã đăng nhập
When: PATCH /api/users/me/profile/ với {"display_name": "Alice N.", "bio": "..."}
Then: Response 200 với dữ liệu đã cập nhật
  And: user_profile được cập nhật trong DB
```

### AC-PROF-03: Points Auto-Sync
```
Given: alice hoàn thành challenge với challenge_point=100
When: user_challenge_progress.completed_at được set (signal trigger)
Then: user_profile.total_challenge_point tăng 100
  And: user_profile.challenge_completed tăng 1
```

### AC-PROF-04: Idempotent Points
```
Given: alice đã complete challenge (completed_at đã set)
When: Signal trigger lại (edge case)
Then: Điểm KHÔNG bị cộng thêm lần nữa
```

### AC-PROF-05: Language Setting
```
Given: alice muốn đổi ngôn ngữ sang tiếng Anh
When: PATCH /api/users/me/settings/ với {"language": "en"}
Then: user_profile.language = "en"
  And: Frontend nhận được ngôn ngữ mới trong API response
```

### AC-PROF-06: Admin Disable User
```
Given: Admin có permission "admin.user.manage"
When: PATCH /api/admin/users/42/ với {"is_active": false}
Then: user.is_active = false
  And: Mọi request của user đó trả 401
```
