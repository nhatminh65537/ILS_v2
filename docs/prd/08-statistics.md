# PRD-08: Statistics & Leaderboard

**Feature:** Statistics — Thống kê và bảng xếp hạng
**Status:** Planned
**Priority:** Low

---

## Context

Hệ thống cần cung cấp bảng xếp hạng (leaderboard) theo từng hạng mục điểm (học tập, challenge, quiz) cho tất cả thành viên. Admin có thêm quyền xem thống kê chi tiết về hoạt động của từng user. Điểm được denormalize trong `user_profile` và có index để truy vấn nhanh.

---

## Problem

Không có cơ chế để thành viên so sánh tiến độ với nhau. Admin không có cách nhìn tổng quan về hoạt động của tổ chức. Thiếu incentive cho thành viên học tập tích cực.

---

## Goal

1. Hiển thị leaderboard theo 3 hạng mục: learning_point, challenge_point, quiz_point.
2. Hiển thị thứ hạng của user hiện tại trên leaderboard.
3. Admin xem thống kê tổng quan và chi tiết theo user.

---

## User Stories

| ID | Actor | Story | Priority |
|----|-------|-------|----------|
| US-STAT-01 | Member | Tôi muốn xem bảng xếp hạng theo điểm challenge. | High |
| US-STAT-02 | Member | Tôi muốn xem bảng xếp hạng theo điểm học tập. | Medium |
| US-STAT-03 | Member | Tôi muốn xem bảng xếp hạng theo điểm quiz. | Medium |
| US-STAT-04 | Member | Tôi muốn biết thứ hạng hiện tại của mình. | Medium |
| US-STAT-05 | Admin | Tôi muốn xem tổng quan: số user active, content được học nhiều nhất. | Medium |
| US-STAT-06 | Admin | Tôi muốn xem thống kê chi tiết của một user cụ thể. | Medium |
| US-STAT-07 | Admin | Tôi muốn xem danh sách challenge được giải nhiều/ít nhất. | Low |
| US-STAT-08 | Admin | Tôi muốn xem activity của hệ thống theo ngày/tuần/tháng. | Low |

---

## Functional Requirements

### FR-STAT-01: Leaderboard
- Endpoint list users sorted by điểm (desc).
- Hạng mục: `learning` (total_learning_point), `challenge` (total_challenge_point), `quiz` (total_quiz_point).
- Trả về: rank, username, display_name, avatar_url, điểm.
- Pagination (top 50 mặc định).
- Index đã tạo sẵn trên `user_profile(total_*_point DESC)`.

### FR-STAT-02: My Rank
- Trả về thứ hạng của user hiện tại trong từng hạng mục.
- Dùng window function `RANK()` hoặc đếm user có điểm cao hơn.

### FR-STAT-03: Admin Overview
- Tổng số users active.
- Số logins trong 7/30 ngày qua.
- Top 5 challenges được solve nhiều nhất.
- Top 5 courses được hoàn thành nhiều nhất.
- Tổng số submits (đúng/sai) theo ngày.

### FR-STAT-04: Admin User Detail Stats
- Với user_id: trả về toàn bộ progress (courses, challenges, quizzes).
- Lịch sử submit challenge theo thời gian.
- Lịch sử quiz attempts.

### FR-STAT-05: Challenge Statistics
- Số lần solved, số unique users solved.
- Tỷ lệ giải đúng lần đầu.
- Danh sách user đã solved.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Nhiều users cùng điểm | Rank như nhau (DENSE_RANK) |
| User không có profile | Điểm = 0, vẫn xuất hiện nếu active |
| Leaderboard rất lớn (100 users) | Pagination, không load all |
| Admin xem user không tồn tại | Trả 404 |

---

## API / Data Structure

### Endpoints

```
# Public Leaderboard
GET  /api/stats/leaderboard/?type=challenge   # Challenge leaderboard
GET  /api/stats/leaderboard/?type=learning    # Learning leaderboard
GET  /api/stats/leaderboard/?type=quiz        # Quiz leaderboard
GET  /api/stats/me/rank/                      # My rank in all categories

# Admin Statistics
GET  /api/stats/admin/overview/               # System overview
GET  /api/stats/admin/users/{id}/             # User detail stats
GET  /api/stats/admin/challenges/             # Challenge stats
GET  /api/stats/admin/activity/?range=7d      # Activity timeline
```

### Leaderboard Response

```json
{
  "type": "challenge",
  "my_rank": 5,
  "results": [
    { "rank": 1, "username": "alice", "display_name": "Alice N.", "avatar_url": "...", "score": 2500 },
    { "rank": 2, "username": "bob", "display_name": "Bob T.", "avatar_url": "...", "score": 2200 }
  ],
  "total_users": 87
}
```

### My Rank Response

```json
{
  "learning": { "rank": 3, "score": 800, "total_users": 87 },
  "challenge": { "rank": 5, "score": 1200, "total_users": 87 },
  "quiz": { "rank": 12, "score": 300, "total_users": 87 }
}
```

### Admin Overview Response

```json
{
  "total_users": 95,
  "active_users_7d": 42,
  "top_challenges": [
    { "title": "Login Bypass", "solved_count": 35 }
  ],
  "top_courses": [
    { "title": "Web Security", "completed_count": 28 }
  ],
  "daily_submits": [
    { "date": "2026-03-09", "correct": 25, "wrong": 18 }
  ]
}
```

---

## Acceptance Criteria

### AC-STAT-01: Challenge Leaderboard
```
Given: 3 users với challenge_point: alice=1200, bob=900, charlie=1200
When: GET /api/stats/leaderboard/?type=challenge
Then: alice và charlie có rank=1 (DENSE_RANK), bob có rank=2
  And: List được sort desc by score
```

### AC-STAT-02: My Rank
```
Given: alice có challenge_point=1200, 10 users có điểm cao hơn
When: GET /api/stats/me/rank/
Then: Response challenge.rank = 11
```

### AC-STAT-03: Admin Overview
```
Given: Admin có permission "admin.stats.view"
When: GET /api/stats/admin/overview/
Then: Response 200 với dữ liệu tổng quan
  And: top_challenges được sort by solved_count desc
```

### AC-STAT-04: Leaderboard Index Performance
```
Given: 100 users với đầy đủ profile
When: GET /api/stats/leaderboard/?type=challenge
Then: Query dùng index idx_user_profile_total_challenge_point
  And: Response time < 200ms
```
