---
goal: Slice 9 Task 9.1 Notification API (IMPL_PLAN contract)
version: 1.0
date_created: 2026-04-17
last_updated: 2026-04-17
owner: Backend Team A
status: 'Completed'
tags: [feature, backend, api, notification, slice-9, task-9.1]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Plan này triển khai Task 9.1 theo hợp đồng trong docs/IMPL_PLAN.md: inbox notification cho user và admin broadcast endpoint. Scope chỉ bao gồm API backend + test + cập nhật tài liệu liên quan trong cùng phiên; không bao gồm signal auto-trigger (Task 9.2), WebSocket consumer (Task 9.3), và frontend UI (Task 9.4/9.5).

## 1. Requirements & Constraints

- REQ-001: Triển khai GET /api/notifications/ trả danh sách notification của request.user, sắp unread trước, sau đó created_at giảm dần.
- REQ-002: Triển khai POST /api/notifications/{id}/mark-read/ để đánh dấu một notification của chính request.user là đã đọc.
- REQ-003: Triển khai POST /api/notifications/mark-all-read/ để đánh dấu toàn bộ notification chưa đọc của request.user là đã đọc.
- REQ-004: Triển khai GET /api/notifications/unread-count/ trả payload ổn định dạng {"count": <int>}.
- REQ-005: Triển khai POST /api/admin/notifications/broadcast/ cho Admin để broadcast notification đến tất cả user active.
- REQ-006: Broadcast phải tạo bản ghi Notification cho từng user active (user-scoped) với is_broadcast=True để tương thích query hiện tại.
- REQ-007: Các endpoint phải dùng serializer tách biệt cho read/list/broadcast input để tránh mass assignment.
- REQ-008: Notification list response phải expose tối thiểu các field đang dùng trong NotificationSerializer: id, type, title, message, metadata, is_read, read_at, created_at.
- SEC-001: Toàn bộ endpoint user inbox yêu cầu IsAuthenticated và HasJWTPermission.
- SEC-002: Endpoint broadcast chỉ cho role Admin; Editor và Member phải nhận 403.
- SEC-003: mark-read phải trả 404 nếu notification không thuộc request.user (không được lộ existence của bản ghi user khác).
- SEC-004: mark-all-read chỉ cập nhật notification của request.user; không chạm dữ liệu user khác.
- API-001: Giữ nguyên route hiện có /api/notifications/ qua NotificationViewSet; thêm action mới unread-count và mark-all-read.
- API-002: Endpoint admin broadcast phải đúng đường dẫn /api/admin/notifications/broadcast/ theo IMPL_PLAN.
- API-003: Payload lỗi validate của broadcast phải ổn định theo key serializer (type, title, message).
- CON-001: Tuân thủ AGENT.md checklist trước coding: STATUS, DECISIONS, BUGS, ARCHITECTURE, DATA_MODEL.
- CON-002: Không thay đổi schema DB trong Task 9.1 (không migration); dùng model Notification hiện có trong backend/api/models.py.
- CON-003: Tuân thủ nguyên tắc functional-first; chỉ thêm logic cần thiết cho API contract Task 9.1.
- CON-004: Đồng bộ tài liệu downstream trong cùng phiên theo AGENT.md (ít nhất docs/API.md và docs/STATUS.md).
- GUD-001: Tái sử dụng pattern ViewSet + @action trong backend/api/views/*.py.
- GUD-002: Tái sử dụng add_role_granted decorator để scanner RBAC tự phát hiện permission key.
- GUD-003: Tách business logic ra service module backend/api/services/notification_service.py để tránh phình view.
- PAT-001: Bulk update mark-all-read phải dùng queryset.update để giảm N+1 write.
- PAT-002: Query list phải deterministic bằng annotate/order_by rõ ràng: unread trước rồi created_at desc.
- OPS-001: Bổ sung test module riêng backend/api/tests/test_notification_api.py và chạy pytest target trước khi kết phiên.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Chuẩn hóa contract và cấu trúc module cho Notification API Task 9.1.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Tạo serializer input cho broadcast trong backend/api/serializers/system.py: NotificationBroadcastSerializer với field bắt buộc `type`, `title`, `message`; field tùy chọn `metadata`; validate `type` theo Notification.NotificationType. | ✅ | 2026-04-17 |
| TASK-002 | Bổ sung serializer output unread-count trong backend/api/serializers/system.py để đảm bảo response key cố định `count`. | ✅ | 2026-04-17 |
| TASK-003 | Tạo backend/api/services/notification_service.py với hàm `broadcast_notification(payload)` và `mark_all_read_for_user(user)` để gom business logic. | ✅ | 2026-04-17 |
| TASK-004 | Export service mới qua backend/api/services/__init__.py. | ✅ | 2026-04-17 |

### Implementation Phase 2

- GOAL-002: Nâng cấp user inbox endpoints trên NotificationViewSet theo hợp đồng Task 9.1.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Cập nhật backend/api/views/notifications.py: thêm `permission_classes = [IsAuthenticated, HasJWTPermission]`. | ✅ | 2026-04-17 |
| TASK-006 | Cập nhật `NotificationViewSet.get_queryset()` để lọc theo request.user và sắp xếp unread trước (`is_read` asc, `created_at` desc). | ✅ | 2026-04-17 |
| TASK-007 | Chuẩn hóa `mark_read` action với url_path `mark-read`; chỉ thao tác trên object thuộc queryset user hiện tại. | ✅ | 2026-04-17 |
| TASK-008 | Thêm action detail=False `mark_all_read` (POST, url_path `mark-all-read`) gọi service và trả số bản ghi cập nhật. | ✅ | 2026-04-17 |
| TASK-009 | Thêm action detail=False `unread_count` (GET, url_path `unread-count`) trả `{count: <int>}`. | ✅ | 2026-04-17 |

### Implementation Phase 3

- GOAL-003: Bổ sung admin broadcast endpoint đúng URL /api/admin/notifications/broadcast/.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Tạo `AdminNotificationViewSet` với `permission_classes = [IsAuthenticated, HasJWTPermission]` và `@add_role_granted('Admin')`. | ✅ | 2026-04-17 |
| TASK-011 | Thêm action `broadcast` (POST) dùng NotificationBroadcastSerializer và trả `recipient_count`. | ✅ | 2026-04-17 |
| TASK-012 | Cập nhật backend/api/views/__init__.py để export viewset admin notification mới. | ✅ | 2026-04-17 |
| TASK-013 | Cập nhật backend/api/urls.py register `admin/notifications` để route thực tế là /api/admin/notifications/broadcast/. | ✅ | 2026-04-17 |

### Implementation Phase 4

- GOAL-004: Hoàn thiện test coverage và kiểm chứng hành vi bảo mật/contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Tạo file backend/api/tests/test_notification_api.py với fixture user admin/editor/member và dữ liệu test notification. | ✅ | 2026-04-17 |
| TASK-015 | Viết test list notifications: chỉ thấy notification của mình, verify unread-first + created_at desc. | ✅ | 2026-04-17 |
| TASK-016 | Viết test mark-read: owner thành công; non-owner nhận 404. | ✅ | 2026-04-17 |
| TASK-017 | Viết test mark-all-read: chỉ update unread của current user; kiểm tra response count và unread-count giảm đúng. | ✅ | 2026-04-17 |
| TASK-018 | Viết test unread-count: trả đúng count trước và sau thao tác mark-read/mark-all-read. | ✅ | 2026-04-17 |
| TASK-019 | Viết test admin broadcast: Admin tạo thành công và recipient_count bằng số user active; Editor/Member bị 403. | ✅ | 2026-04-17 |
| TASK-020 | Chạy `pytest backend/api/tests/test_notification_api.py -q` và `pytest backend/api/tests/test_rbac_api.py -q`. | ✅ | 2026-04-17 |

### Implementation Phase 5

- GOAL-005: Đồng bộ tài liệu và hoàn tất đóng phiên theo quy trình AGENT.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Cập nhật docs/API.md: chuyển Notification API Task 9.1 endpoints sang trạng thái active/stable. | ✅ | 2026-04-17 |
| TASK-022 | Cập nhật docs/STATUS.md: đánh dấu Slice 9 Task 9.1 hoàn tất sau khi test pass. | ✅ | 2026-04-17 |
| TASK-023 | Cập nhật docs/IMPL_PLAN.md: không đổi nội dung contract, giữ làm nguồn scope gốc. | ✅ | 2026-04-17 |
| TASK-024 | Tạo session report docs/reports/2026-04-17_slice9-task9-1-notification-api.md. | ✅ | 2026-04-17 |

## 3. Alternatives

- ALT-001: Dùng model hai bảng notification + user_notification như PRD mô tả. Không chọn cho Task 9.1 vì codebase hiện dùng model Notification một bảng; thay đổi schema sẽ vượt scope và tạo migration risk.
- ALT-002: Gộp admin broadcast vào NotificationViewSet bằng custom re_path thủ công. Không chọn vì router `admin/notifications` cho action broadcast rõ ràng hơn, đồng bộ pattern admin modules hiện có.
- ALT-003: Triển khai mark-all-read bằng loop từng object gọi mark_as_read(). Không chọn vì hiệu năng kém và dễ N+1 write; queryset.update deterministic hơn.

## 4. Dependencies

- DEP-001: docs/IMPL_PLAN.md (Slice 9 Task 9.1 endpoint contract).
- DEP-002: AGENT.md (document dependency + completion report workflow).
- DEP-003: docs/DECISIONS.md.
- DEP-004: backend/api/models.py class Notification.
- DEP-005: backend/api/views/notifications.py.
- DEP-006: backend/api/serializers/system.py.
- DEP-007: backend/api/urls.py.
- DEP-008: auth_app.permissions.HasJWTPermission và add_role_granted scanner decorator.

## 5. Files

- FILE-001: backend/api/views/notifications.py.
- FILE-002: backend/api/serializers/system.py.
- FILE-003: backend/api/services/notification_service.py.
- FILE-004: backend/api/services/__init__.py.
- FILE-005: backend/api/views/__init__.py.
- FILE-006: backend/api/urls.py.
- FILE-007: backend/api/tests/test_notification_api.py.
- FILE-008: docs/API.md.
- FILE-009: docs/STATUS.md.
- FILE-010: docs/reports/2026-04-17_slice9-task9-1-notification-api.md.
- FILE-011: plan/feature-notification-task9-1-notification-api-1.md.

## 6. Testing

- TEST-001: GET /api/notifications/ chỉ trả notification của current user và đúng thứ tự unread-first.
- TEST-002: POST /api/notifications/{id}/mark-read/ với owner trả 200 và set is_read=True, read_at!=null.
- TEST-003: POST /api/notifications/{id}/mark-read/ với non-owner trả 404.
- TEST-004: POST /api/notifications/mark-all-read/ cập nhật đúng số lượng unread của current user.
- TEST-005: GET /api/notifications/unread-count/ trả count chính xác trước/sau mark-all-read.
- TEST-006: POST /api/admin/notifications/broadcast/ với Admin trả 201 và recipient_count bằng số user active.
- TEST-007: POST /api/admin/notifications/broadcast/ với Editor/Member trả 403.
- TEST-008: Chạy `pytest backend/api/tests/test_notification_api.py -q` thành công.
- TEST-009: Chạy regression `pytest backend/api/tests/test_rbac_api.py -q` thành công.

## 7. Risks & Assumptions

- RISK-001: PRD và IMPL_PLAN khác method/path notification; cần duy trì docs sync để tránh lệch kỳ vọng frontend.
- RISK-002: Broadcast tạo nhiều bản ghi đồng bộ có thể chậm khi user active lớn; Task 9.1 chưa đưa queue/async.
- RISK-003: Model một bảng Notification chưa bao phủ hoàn toàn quản trị/schedule/cancel nâng cao theo PRD.
- RISK-004: Permission scanner phụ thuộc naming/action; đổi tên action không đồng bộ có thể tạo false 403.
- ASSUMPTION-001: Task 9.1 chuẩn contract theo docs/IMPL_PLAN.md (đã xác nhận).
- ASSUMPTION-002: Scope Task 9.1 không bao gồm WebSocket delivery, signal trigger, scheduling.
- ASSUMPTION-003: Không cần migration cho Task 9.1 vì model Notification hiện tại đủ field phục vụ contract.

## 8. Related Specifications / Further Reading

- AGENT.md
- docs/IMPL_PLAN.md
- docs/STATUS.md
- docs/DECISIONS.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/API.md
- docs/prd/07-notification.md
- backend/api/models.py
- backend/api/views/notifications.py
- backend/api/urls.py
