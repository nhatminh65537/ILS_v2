---
goal: Slice 9 Task 9.4 Frontend Notification Bell and Inbox
version: 1.0
date_created: 2026-04-20
last_updated: 2026-04-20
owner: Frontend Team A
status: 'Planned'
tags: [feature, frontend, notification, slice-9, task-9.4]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan này triển khai Task 9.4 cho user surface: bell thông báo realtime ở thanh điều hướng và inbox đầy đủ tại route locale-first. Plan tuân thủ contract backend đã active ở Slice 9.1-9.3, đồng thời chuẩn hóa các phần frontend đang lệch contract trước khi build UI chính.

## 1. Requirements & Constraints

- REQ-001: Triển khai bell thông báo trên user surface, hiển thị badge unread count theo dữ liệu từ GET /api/notifications/unread-count/.
- REQ-002: Bell dropdown phải hiển thị tối đa 5 notification mới nhất, unread trước, có action đi đến inbox đầy đủ.
- REQ-003: Triển khai inbox tại frontend/app/[locale]/(app)/notifications/page.tsx, hiển thị danh sách notification theo contract GET /api/notifications/.
- REQ-004: Inbox hỗ trợ mark single read qua POST /api/notifications/{id}/mark-read/.
- REQ-005: Inbox hỗ trợ mark all read qua POST /api/notifications/mark-all-read/.
- REQ-006: Dữ liệu inbox phải cập nhật realtime qua WebSocket /ws/notifications/ dùng first-message auth.
- REQ-007: Khi nhận event WS type=notification, UI phải prepend notification mới và tăng unread badge nếu is_read=false.
- REQ-008: Khi user mark read hoặc mark all read, UI phải đồng bộ badge unread count ngay trong cùng tick render.
- REQ-009: Notification page phải dùng i18n keys ở frontend/messages/en.json và frontend/messages/vi.json, không hardcode user-facing text.
- REQ-010: Không thay đổi backend code trong Task 9.4; chỉ thay đổi frontend và MSW contract test doubles.
- SEC-001: WebSocket auth phải gửi access token từ localStorage ở message đầu tiên dạng {"type":"auth","token":"..."}.
- SEC-002: Nếu WS close code là 4001 hoặc 4008 thì client phải chuyển trạng thái lỗi auth rõ ràng, không retry vô hạn.
- SEC-003: Bell/inbox chỉ render cho user đã authenticated; không mở API notifications khi chưa đăng nhập.
- API-001: Frontend phải dùng đúng endpoint slug theo backend active: mark-read, mark-all-read, unread-count (dùng dấu gạch ngang).
- API-002: Frontend type contract Notification phải khớp serializer backend: id, type, title, message, metadata, is_read, read_at, created_at.
- API-003: Response mark-all-read phải đọc key updated_count.
- CON-001: Tuân thủ docs/FE_CONVENTIONS.md: component và hook không gọi Axios trực tiếp, chỉ gọi qua src/services/notifications.service.ts.
- CON-002: Tuân thủ route inventory: user inbox nằm ở frontend/app/[locale]/(app)/notifications/page.tsx.
- CON-003: Bell phải được tích hợp vào vùng trailing controls hiện hữu trong frontend/src/components/layouts/SessionNavControls.tsx.
- CON-004: Không làm thay đổi phạm vi Task 9.5 (admin broadcast page), file admin notifications page chỉ giữ nguyên hoặc không đụng vào.
- CON-005: Plan này xử lý conflict contract hiện có giữa frontend skeleton và backend active contract trước khi triển khai UI.
- GUD-001: Tái sử dụng pattern WebSocket URL resolve đã dùng ở src/hooks/useQuizSession.ts (NEXT_PUBLIC_WS_URL ưu tiên, fallback từ NEXT_PUBLIC_API_URL).
- GUD-002: Tách logic domain vào hook riêng để component NotificationBell và inbox page chỉ xử lý render/state binding.
- PAT-001: State updates cho notifications.store phải immutable và deterministic theo id.
- PAT-002: MSW handlers notifications phải đồng bộ endpoint paths với backend để integration/UI checks không false-negative.
- OPS-001: Hoàn tất kiểm chứng qua lint, type-check, build và ít nhất một flow browser test cho bell + inbox.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Chuẩn hóa contract frontend notifications với backend active API trước khi làm UI (hoàn tất khi tất cả call path và DTO fields khớp API.md mục 3.7).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật frontend/src/types/notification.types.ts: thay model field notification_type thành type, thay link/icon/updated_at bằng metadata để khớp backend NotificationSerializer; giữ enum tương thích Notification.NotificationType backend. |  |  |
| TASK-002 | Cập nhật frontend/src/services/notifications.service.ts: đổi endpoint mark_read -> mark-read, mark_all_read -> mark-all-read; thêm hàm getUnreadNotificationCount() gọi /api/notifications/unread-count/; cập nhật return type markAllNotificationsRead() đọc updated_count. |  |  |
| TASK-003 | Cập nhật frontend/src/stores/notifications.store.ts: thêm action upsertRealtimeNotification(notification), setUnreadCount(count), và ensure sorting unread-first rồi created_at desc tại setNotifications. |  |  |
| TASK-004 | Cập nhật frontend/src/mocks/data/fixtures.ts để notification fixture theo contract mới (type/message/metadata). |  |  |
| TASK-005 | Cập nhật frontend/src/mocks/handlers/notifications.handlers.ts: endpoint paths dùng dấu gạch ngang, bổ sung GET /api/notifications/unread-count/, response mark-all-read trả updated_count. |  |  |

### Implementation Phase 2

- GOAL-002: Triển khai luồng realtime notifications reusable bằng hook riêng (hoàn tất khi có hook kết nối WS, auth first-message, và push event vào store).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Tạo frontend/src/hooks/useNotificationSocket.ts với function useNotificationSocket(options): resolve wsRoot, connect tới /ws/notifications/, gửi auth message, handle auth_ok, notification, error, close codes 4001/4008. |  |  |
| TASK-007 | Tạo frontend/src/hooks/useNotifications.ts với function useNotifications(params): gọi listNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead; đồng bộ useNotificationsStore và expose actions cho UI. |  |  |
| TASK-008 | Tích hợp useNotificationSocket vào useNotifications để nhận event notification realtime và gọi upsertRealtimeNotification() + unread increment guard. |  |  |

### Implementation Phase 3

- GOAL-003: Triển khai NotificationBell trong navbar user surface (hoàn tất khi bell hiển thị unread badge, dropdown preview 5 items, và deep-link tới inbox).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Tạo frontend/src/components/features/notifications/NotificationBell.tsx: render bell button + badge + dropdown list latest 5, action mark read cho từng item, và link tới /{locale}/notifications. |  |  |
| TASK-010 | Cập nhật frontend/src/components/layouts/SessionNavControls.tsx: với user authenticated, render NotificationBell cạnh avatar dropdown; giữ nguyên hành vi guest controls. |  |  |
| TASK-011 | Thêm khóa i18n cần cho bell dropdown trong frontend/messages/en.json và frontend/messages/vi.json: title, unreadBadgeLabel, openInbox, loading, errorRealtime, justNow. |  |  |

### Implementation Phase 4

- GOAL-004: Hoàn thiện inbox page cho user với action mark-read/mark-all-read và trạng thái loading-empty-error (hoàn tất khi route notifications hoạt động end-to-end với service/store/hook).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Thay nội dung skeleton tại frontend/app/[locale]/(app)/notifications/page.tsx bằng page server component lấy translations và mount client component inbox. |  |  |
| TASK-013 | Tạo frontend/src/components/features/notifications/NotificationsInboxClient.tsx: render list, pagination controls (limit/offset đơn giản), mark single, mark all, unread badge summary. |  |  |
| TASK-014 | Implement optimistic UI deterministic: khi mark-read success thì cập nhật item.is_read=true và unreadCount giảm 1; khi mark-all-read success thì set all is_read=true và unreadCount=0; rollback bằng refetch nếu request fail. |  |  |
| TASK-015 | Bổ sung empty/error/loading states dùng UI primitives hiện có, không tạo style system mới. |  |  |

### Implementation Phase 5

- GOAL-005: Xác thực kỹ thuật và behavior của Task 9.4 (hoàn tất khi lint, type-check, build pass và có browser scenario pass cho bell + inbox).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Tạo hoặc cập nhật frontend Playwright checklist cho Slice 9 (ví dụ frontend/playwright.slice9.checklist.test.ts) với các case: unread badge load, mark single read, mark all read, redirect/inbox link từ bell. |  |  |
| TASK-017 | Chạy npm run lint trong frontend và sửa toàn bộ lỗi phát sinh từ thay đổi Task 9.4. |  |  |
| TASK-018 | Chạy npx tsc --noEmit trong frontend và sửa toàn bộ lỗi type phát sinh từ contract normalization. |  |  |
| TASK-019 | Chạy npm run build trong frontend, đảm bảo route /[locale]/notifications build thành công. |  |  |
| TASK-020 | Chạy browser validation cho luồng realtime: mở 2 tab user, tạo notification từ backend admin endpoint, xác nhận bell badge/inbox cập nhật theo WS event. |  |  |

## 3. Alternatives

- ALT-001: Không normalize contract, giữ endpoint underscore mark_read/mark_all_read ở frontend. Không chọn vì trái backend active route và sẽ gây lỗi 404 thực tế.
- ALT-002: Chỉ làm inbox polling, không dùng WS cho bell. Không chọn vì trái FR realtime của PRD-07 và bỏ qua thành quả Task 9.3.
- ALT-003: Nhúng toàn bộ logic fetch/socket vào NotificationBell component. Không chọn vì khó tái sử dụng cho inbox page và khó test.
- ALT-004: Đặt bell vào Navbar.tsx trực tiếp. Không chọn vì AppShell hiện truyền trailing qua SessionNavControls, sửa tại SessionNavControls giữ phạm vi thay đổi nhỏ hơn và đúng kiến trúc hiện tại.

## 4. Dependencies

- DEP-001: docs/IMPL_PLAN.md (Slice 9 Task 9.4 scope).
- DEP-002: docs/STATUS.md (Task 9.4 là mục pending duy nhất ở user notifications frontend).
- DEP-003: docs/API.md section 3.7 (active notification HTTP + WS contract).
- DEP-004: docs/prd/07-notification.md (functional expectations bell/inbox/realtime).
- DEP-005: docs/FE_CONVENTIONS.md (service/store/hook conventions và route group rules).
- DEP-006: backend/api/views/notifications.py (định nghĩa endpoint paths và response keys hiện hành).
- DEP-007: backend/realtime/consumers/notification_consumer.py (WS protocol và close codes).
- DEP-008: frontend/src/lib/axios.ts (token attach + auth error normalization).
- DEP-009: frontend/src/hooks/useQuizSession.ts (mẫu resolve NEXT_PUBLIC_WS_URL fallback).

## 5. Files

- FILE-001: frontend/src/types/notification.types.ts — normalize DTO contract theo backend serializer.
- FILE-002: frontend/src/services/notifications.service.ts — normalize endpoints + add unread count API.
- FILE-003: frontend/src/stores/notifications.store.ts — add realtime and unread synchronization actions.
- FILE-004: frontend/src/hooks/useNotificationSocket.ts — new websocket orchestration hook for notifications.
- FILE-005: frontend/src/hooks/useNotifications.ts — new domain hook cho list/read/actions.
- FILE-006: frontend/src/components/features/notifications/NotificationBell.tsx — new bell dropdown component.
- FILE-007: frontend/src/components/features/notifications/NotificationsInboxClient.tsx — new inbox client component.
- FILE-008: frontend/src/components/layouts/SessionNavControls.tsx — integrate NotificationBell vào trailing controls.
- FILE-009: frontend/app/[locale]/(app)/notifications/page.tsx — replace skeleton with functional page entry.
- FILE-010: frontend/messages/en.json — add/adjust notifications i18n keys.
- FILE-011: frontend/messages/vi.json — add/adjust notifications i18n keys.
- FILE-012: frontend/src/mocks/data/fixtures.ts — align notification fixture shape.
- FILE-013: frontend/src/mocks/handlers/notifications.handlers.ts — align endpoint handlers + unread-count.
- FILE-014: frontend/playwright.slice9.checklist.test.ts — new or updated slice 9 browser checklist.

## 6. Testing

- TEST-001: Unit behavior via hook/component interaction: useNotifications load list + unread count đồng bộ store đúng số liệu unread.
- TEST-002: Bell dropdown render latest 5 notification, badge count > 0 khi có unread.
- TEST-003: Mark single read từ bell hoặc inbox gọi POST /api/notifications/{id}/mark-read/ và giảm badge đúng 1.
- TEST-004: Mark all read gọi POST /api/notifications/mark-all-read/ và set unread badge về 0.
- TEST-005: Inbox empty state xuất hiện khi list rỗng; loading state xuất hiện trong lúc fetch.
- TEST-006: WS auth flow thành công: client gửi first-message auth và nhận auth_ok trước khi nhận event notification.
- TEST-007: WS close code 4001/4008 hiển thị realtime error state xác định, không crash component.
- TEST-008: Chạy npm run lint trong frontend pass.
- TEST-009: Chạy npx tsc --noEmit trong frontend pass.
- TEST-010: Chạy npm run build trong frontend pass.
- TEST-011: Chạy Playwright slice 9 checklist (bell + inbox + read actions + realtime update) pass.

## 7. Risks & Assumptions

- RISK-001: Frontend hiện đang dùng contract cũ (notification_type, mark_read, mark_all_read); nếu normalize thiếu một điểm sẽ phát sinh lỗi runtime khó truy vết.
- RISK-002: Realtime events có thể đến giữa lúc user bấm mark-all-read, gây race condition badge count.
- RISK-003: WebSocket reconnect policy nếu quá aggressive có thể tạo nhiều connection song song khi tab switch nhanh.
- RISK-004: Dữ liệu MSW nếu không cập nhật đồng bộ với DTO mới sẽ tạo false-positive ở local checks.
- ASSUMPTION-001: Backend Slice 9.1-9.3 contract hiện tại là nguồn sự thật cho frontend Task 9.4.
- ASSUMPTION-002: NEXT_PUBLIC_API_URL luôn có giá trị hợp lệ trong môi trường dev; nếu NEXT_PUBLIC_WS_URL thiếu thì fallback ws root từ API URL là hợp lệ.
- ASSUMPTION-003: Task 9.4 chỉ bao phủ user surface bell + inbox; admin broadcast UI là Task 9.5 xử lý riêng.
- ASSUMPTION-004: Notification list endpoint tiếp tục trả ordering unread-first từ backend; frontend không cần sort lại toàn bộ sau mỗi fetch.

## 8. Related Specifications / Further Reading

- AGENT.md
- CLAUDE.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/API.md
- docs/ARCHITECTURE.md
- docs/FE_CONVENTIONS.md
- docs/FE_PAGE_INVENTORY.md
- docs/prd/07-notification.md
- backend/api/views/notifications.py
- backend/realtime/consumers/notification_consumer.py
