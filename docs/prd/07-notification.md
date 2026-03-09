# PRD-07: Notification

**Feature:** Notification — Hệ thống thông báo
**Status:** Planned
**Priority:** Low

---

## Context

Hệ thống thông báo hỗ trợ hai loại: **thủ công** (admin tạo và broadcast tới tất cả user) và **tự động** (trigger khi user hoàn thành course/challenge/quiz). Thông báo được deliver realtime qua WebSocket (Django Channels) và persistent trong DB. User có thể đánh dấu đã đọc.

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
- Tạo `notification` với `type=manual`, `is_broadcast=True`.
- `title`, `body`, `payload` (optional JSONB).
- `send_at`: null = gửi ngay, datetime = schedule.
- Khi gửi: tạo `user_notification` record cho TẤT CẢ user active.
- Gửi realtime qua WebSocket broadcast channel.

### FR-NOTIF-02: Auto Notifications (System)
- Trigger từ Django signals khi progress được cập nhật:
  - `user_course_progress.completed_at` set → `type=auto_course_complete`
  - `user_challenge_progress.completed_at` set → `type=auto_challenge_complete`
  - `user_quiz_progress.completed_at` set → `type=auto_quiz_complete`
- Tạo `notification` (per user, không broadcast) + `user_notification`.
- Gửi realtime tới WebSocket channel của user đó.

### FR-NOTIF-03: WebSocket Delivery
- User kết nối `ws://{host}/ws/notifications/` sau khi auth.
- Server push notification payload khi có notification mới.
- Format: `{ "type": "notification", "data": { notification object } }`.
- Nếu user offline: notification đã lưu trong DB, nhận khi online lại.

### FR-NOTIF-04: Notification Inbox
- List `user_notification` của user với pagination.
- Filter: `is_read=false` (unread only).
- Unread count: trả về số `is_read=false`.
- GET notification detail.

### FR-NOTIF-05: Mark as Read
- Mark single: PUT `/api/notifications/{id}/read/`.
- Mark all: PUT `/api/notifications/read-all/`.
- Set `is_read=True`, `read_at=now()`.

### FR-NOTIF-06: Admin Notification Management
- List tất cả notifications đã tạo.
- Cancel scheduled notification (nếu chưa send).

---

## Edge Cases

| Case | Handling |
|------|----------|
| Broadcast tới 100 users đồng thời | Batch insert user_notification; async WS dispatch |
| User offline khi nhận notification | Lưu DB; delivery khi user connect lại |
| Auto notification trigger nhiều lần (signal bug) | Idempotent: chỉ tạo 1 notification per event per user |
| Admin xóa notification đã broadcast | Cascade xóa user_notification (coi như recall) |
| Send_at trong quá khứ | Gửi ngay lập tức |
| User bị disable trong lúc broadcast | Bỏ qua user đó |

---

## API / Data Structure

### HTTP Endpoints

```
# Admin
GET    /api/notifications/admin/                # List all notifications
POST   /api/notifications/admin/                # Create notification
DELETE /api/notifications/admin/{id}/           # Delete/cancel

# User Inbox
GET    /api/notifications/                      # My notifications (paginated)
GET    /api/notifications/unread-count/         # Unread count
PUT    /api/notifications/{id}/read/            # Mark single as read
PUT    /api/notifications/read-all/             # Mark all as read
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
    "notification_id": 12,
    "title": "Challenge Solved!",
    "body": "You solved 'Login Bypass' and earned 100 points.",
    "notification_type": "auto_challenge_complete",
    "payload": { "challenge_id": 5, "points": 100 },
    "is_read": false,
    "created_at": "2026-03-09T10:00:00Z"
  }
}
```

### Key DB Tables

```sql
-- notification: id, title, body, payload JSONB, send_at, is_broadcast, notification_type
-- user_notification: id, notification_id, user_id, is_read, read_at
```

### Notification List Response

```json
{
  "count": 5,
  "unread": 2,
  "results": [
    {
      "id": 45,
      "title": "Welcome!",
      "body": "You completed the course.",
      "notification_type": "auto_course_complete",
      "is_read": false,
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
When: Admin POST /api/notifications/admin/ với is_broadcast=true
Then: 3 user_notification records được tạo
  And: Tất cả user đang online nhận WS message
```

### AC-NOTIF-02: Auto Notification on Challenge Solve
```
Given: alice giải được challenge "web-login-bypass"
When: user_challenge_progress.completed_at được set
Then: notification type=auto_challenge_complete được tạo cho alice
  And: user_notification được tạo với is_read=false
  And: Nếu alice online → nhận WS push ngay
```

### AC-NOTIF-03: Mark as Read
```
Given: alice có 5 unread notifications
When: PUT /api/notifications/read-all/
Then: Tất cả 5 user_notification.is_read = true
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
