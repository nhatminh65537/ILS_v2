# PRD-07: Notification

**Feature:** Notification — Hệ thống thông báo
**Status:** Planned
**Priority:** Low

---

## Context

Hệ thống thông báo hỗ trợ hai loại: **thủ công** (admin tạo và broadcast tới tất cả user) và **tự động** (trigger khi user hoàn thành course/challenge/quiz). Thông báo được deliver realtime qua WebSocket (Django Channels) và persistent trong DB. User có thể đánh dấu đã đọc.

Contract API/WS trong PRD này đã được đồng bộ với runtime hiện tại (Slice 9.1-9.3). Nguồn sự thật route là `docs/API.md` và backend view/consumer.

---

## Problem

Không có cơ chế thông báo. Admin không thể announce sự kiện. User không nhận được phản hồi khi đạt thành tích (hoàn thành course, solve challenge). Không có inbox để xem lại thông báo.

---

## Goal

1. Admin tạo thông báo broadcast tới tất cả user.
2. Hệ thống tự động gửi thông báo khi user hoàn thành content.
3. Deliver thông báo realtime qua WebSocket.
4. User có inbox để đọc và đánh dấu đã đọc.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-NOTIF-01 | Admin | Tôi muốn tạo thông báo với tiêu đề và nội dung rồi gửi ngay. | High |
| US-NOTIF-02 | Admin | Tôi muốn schedule thông báo để gửi vào thời điểm cụ thể. | Low |
| US-NOTIF-03 | System | Khi user hoàn thành course, gửi thông báo tự động. | Medium |
| US-NOTIF-04 | System | Khi user giải được challenge, gửi thông báo tự động. | Medium |
| US-NOTIF-05 | System | Khi user hoàn thành quiz, gửi thông báo tự động. | Medium |
| US-NOTIF-06 | Member | Tôi muốn nhận thông báo realtime khi đang online. | High |
| US-NOTIF-07 | Member | Tôi muốn xem inbox thông báo chưa đọc. | High |
| US-NOTIF-08 | Member | Tôi muốn đánh dấu thông báo đã đọc hoặc đọc tất cả. | Medium |

---

## Functional Requirements

### FR-NOTIF-01: Manual Broadcast (Admin)
- Admin gọi endpoint broadcast để tạo notification cho TẤT CẢ user active.
- Payload gồm: `type`, `title`, `message`, `metadata` (optional JSON object).
- Với mỗi user active, tạo một bản ghi `notification` user-scoped (`is_broadcast=true`).
- Mỗi bản ghi mới được push realtime tới channel group của user đó.

### FR-NOTIF-02: Auto Notifications (System)
- Trigger từ Django signals khi progress được cập nhật:
  - `user_course_progress.completed_at` set → `type=auto_course_complete`
  - `user_challenge_progress.completed_at` set → `type=auto_challenge_complete`
  - `user_quiz_progress.completed_at` set → `type=auto_quiz_complete`
- Tạo `notification` user-scoped (`is_broadcast=false`) cho user tương ứng.
- Gửi realtime tới WebSocket channel của user đó.

### FR-NOTIF-03: WebSocket Delivery
- User kết nối `ws://{host}/ws/notifications/` sau khi auth.
- Server push notification payload khi có notification mới.
- Format: `{ "type": "notification", "data": { notification object } }`.
- Nếu user offline: notification đã lưu trong DB, nhận khi online lại.

### FR-NOTIF-04: Notification Inbox
- List `notification` của user với pagination.
- Filter: `is_read=false` (unread only).
- Unread count: trả về số `is_read=false`.
- GET notification detail.

### FR-NOTIF-05: Mark as Read
- Mark single: POST `/api/notifications/{id}/mark-read/`.
- Mark all: POST `/api/notifications/mark-all-read/`.
- Set `is_read=True`, `read_at=now()`.

### FR-NOTIF-06: Admin Notification Management
- MVP runtime hiện tại chỉ triển khai admin broadcast endpoint.
- Các yêu cầu list lịch sử/cancel schedule được giữ là future scope và không thuộc contract active hiện tại.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Broadcast tới 100 users đồng thời | Batch insert notification records theo user active; async WS dispatch theo user group |
| User offline khi nhận notification | Lưu DB; delivery khi user connect lại |
| Auto notification trigger nhiều lần (signal bug) | Idempotent: chỉ tạo 1 notification per event per user |
| Admin xóa notification đã broadcast | Out of scope runtime hiện tại (chưa có endpoint cancel/delete) |
| Send_at trong quá khứ | Gửi ngay lập tức |
| User bị disable trong lúc broadcast | Bỏ qua user đó |

---

## API / Data Structure

### HTTP Endpoints

```
# Admin
POST   /api/admin/notifications/broadcast/      # Broadcast to all active users

# User Inbox
GET    /api/notifications/                      # My notifications (paginated)
GET    /api/notifications/unread-count/         # Unread count
GET    /api/notifications/{id}/                 # Notification detail
POST   /api/notifications/{id}/mark-read/       # Mark single as read
POST   /api/notifications/mark-all-read/        # Mark all as read
```

### WebSocket Endpoint

```
ws://{host}/ws/notifications/
```

### WebSocket Push Message

```json
{
  "type": "notification",
  "data": {
    "id": 45,
    "type": "auto_challenge_complete",
    "title": "Challenge Solved!",
    "message": "You solved 'Login Bypass' and earned 100 points.",
    "metadata": { "challenge_id": 5, "points": 100 },
    "is_read": false,
    "read_at": null,
    "created_at": "2026-03-09T10:00:00Z"
  }
}
```

### Key DB Tables

```sql
-- notification: id, user_id, type, title, message, metadata JSON, is_read, read_at, is_broadcast, event_key, created_at
```

### Notification List Response

```json
{
  "count": 5,
  "results": [
    {
      "id": 45,
      "type": "auto_course_complete",
      "title": "Welcome!",
      "message": "You completed the course.",
      "metadata": { "course_slug": "network-basics" },
      "is_read": false,
      "read_at": null,
      "created_at": "2026-03-09T08:00:00Z"
    }
  ]
}
```

---

## Acceptance Criteria

### AC-NOTIF-01: Admin Broadcast
```
Given: 3 active users trong hệ thống
When: Admin POST /api/admin/notifications/broadcast/
Then: 3 notification records user-scoped được tạo (is_broadcast=true)
  And: Tất cả user đang online nhận WS message
```

### AC-NOTIF-02: Auto Notification on Challenge Solve
```
Given: alice giải được challenge "web-login-bypass"
When: user_challenge_progress.completed_at được set
Then: notification type=auto_challenge_complete được tạo cho alice
  And: notification record được tạo với is_read=false
  And: Nếu alice online → nhận WS push ngay
```

### AC-NOTIF-03: Mark as Read
```
Given: alice có 5 unread notifications
When: POST /api/notifications/mark-all-read/
Then: Tất cả 5 notification.is_read = true
  And: GET /api/notifications/unread-count/ trả về 0
```

### AC-NOTIF-04: Auto Notification Idempotent
```
Given: alice đã nhận notification cho challenge X
When: Signal trigger lần 2 (edge case)
Then: KHÔNG tạo notification thứ 2 cho cùng event
```

### AC-NOTIF-05: Offline Delivery
```
Given: alice đang offline khi nhận broadcast notification
When: alice kết nối WS lần tiếp theo
Then: Inbox của alice có notification mới với is_read=false
```
