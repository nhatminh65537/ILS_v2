# ILS v2 — Product Requirements Documents

Thư mục này chứa PRD (Product Requirements Document) cho tất cả tính năng của ILS v2.

## Feature Index

| # | PRD | Feature | Priority | Status |
|---|-----|---------|----------|--------|
| 01 | [01-authentication.md](01-authentication.md) | Authentication (SSO + Native) | High | ✅ Shipped (Slice 1) |
| 02 | [02-authorization.md](02-authorization.md) | Authorization / Fine-grained RBAC | High | ✅ Shipped (Slice 2) |
| 03 | [03-learn.md](03-learn.md) | Learn — Hệ thống khóa học | Medium-High | ✅ Shipped (Slice 5) |
| 04 | [04-challenge.md](04-challenge.md) | Challenge — CTF | Medium-High | ✅ Shipped (Slice 6) |
| 05 | [05-quiz.md](05-quiz.md) | Quiz — Luyện tập | Medium | ✅ Shipped (Slice 7) |
| 06 | [06-user-profile.md](06-user-profile.md) | User Profile & Settings | Low-Medium | ✅ Shipped (Slice 8) |
| 07 | [07-notification.md](07-notification.md) | Notification | Low | ✅ Shipped (Slice 9) |
| 08 | [08-statistics.md](08-statistics.md) | Statistics & Leaderboard | Low | ✅ Shipped (Slice 11) |
| 09 | [09-ai-assistant.md](09-ai-assistant.md) | AI Assistant | Medium | ⚠️ Deferred |
| 10 | [10-system-config.md](10-system-config.md) | System Configuration | High | ✅ Shipped (Slice 3) |

## PRD Structure

Mỗi PRD bao gồm:

- **Feature** — Tên tính năng
- **Context** — Mô tả tổng quan
- **Problem** — Vấn đề cần giải quyết
- **Goal** — Mục tiêu tính năng
- **User Stories** — Nhu cầu người dùng (ID, Actor, Story, Priority)
- **Functional Requirements** — Yêu cầu chức năng chi tiết
- **Edge Cases** — Trường hợp biên cần xử lý
- **API / Data Structure** — Endpoints và DB tables liên quan
- **Acceptance Criteria** — Tiêu chí nghiệm thu (Given/When/Then)

## Implementation Order

Theo khuyến nghị từ CLAUDE.md:

1. **System Config** (PRD-10) — Prerequisites cho mọi integration
2. **Authentication** (PRD-01) — Cần trước khi làm Authorization
3. **Authorization** (PRD-02) — Cần trước khi làm API features
4. **Learn** (PRD-03) — Content feature ưu tiên cao
5. **Challenge** (PRD-04) — CTF feature
6. **Quiz** (PRD-05) — Practice feature
7. **User Profile** (PRD-06) — Post-content features
8. **Notification** (PRD-07) — Sau khi có content completion
9. **Statistics** (PRD-08) — Sau khi có progress data

## Deferred Features

- **AI Assistant** (PRD-09) — Không nằm trong scope hiện tại. Không triển khai khi chưa có phê duyệt. Xem `docs/STATUS.md` → Deferred Features.
