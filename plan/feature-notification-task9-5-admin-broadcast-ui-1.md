---
goal: Slice 9 Task 9.5 Admin Notification Broadcast and History
version: 2.0
date_created: 2026-04-20
last_updated: 2026-04-20
owner: Backend and Frontend Team
status: 'Planned'
tags: [feature, backend, frontend, notification, admin, slice-9, task-9.5]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements Slice 9 Task 9.5 with expanded scope: admin broadcast creation plus admin broadcast history. The delivery includes backend API extension, frontend admin UI extension, regression tests, and mandatory document propagation updates.

## 1. Requirements & Constraints

- **REQ-001**: Provide admin broadcast create API and admin broadcast history API under /api/admin/notifications/*.
- **REQ-002**: Keep POST /api/admin/notifications/broadcast/ behavior backward-compatible and add a deterministic broadcast_batch_key for each send operation.
- **REQ-003**: Add GET /api/admin/notifications/history/ that returns paginated broadcast batches sorted by sent_at descending.
- **REQ-004**: Each history row must include broadcast_batch_key, type, title, message, metadata, sender, sent_at, recipient_count.
- **REQ-005**: Render admin page at frontend/app/[locale]/(admin)/admin/(protected)/notifications/page.tsx with both broadcast form and history table.
- **REQ-006**: Broadcast form must include type, title, message, metadata with validation and confirmation before submit.
- **REQ-007**: History table must support pagination (limit/offset) and manual refresh action.
- **REQ-008**: Newly submitted broadcast must appear in history list without full page reload.
- **REQ-009**: Display deterministic error states for create and history fetch flows with i18n keys.
- **REQ-010**: Update docs/API.md, docs/IMPL_PLAN.md, docs/FE_PAGE_INVENTORY.md to keep doc chain synchronized after contract changes.
- **REQ-011**: Keep runtime contract alignment with docs/prd/07-notification.md and resolved scope expansion.
- **SEC-001**: Do not expose this UI on user surface routes.
- **SEC-002**: Do not bypass backend authorization; both create and history endpoints require Admin role.
- **SEC-003**: Do not send empty or whitespace-only title/message payload.
- **SEC-004**: Do not return per-user recipient identifiers in history endpoint; only aggregated recipient_count is exposed.
- **API-001**: Keep POST /api/admin/notifications/broadcast/ active and stable.
- **API-002**: Add GET /api/admin/notifications/history/ as the canonical history endpoint.
- **API-003**: Keep serializer payload for broadcast create: {type, title, message, metadata?}.
- **API-004**: Extend broadcast create response to include broadcast_batch_key in addition to recipient_count.
- **API-005**: History response format must be DRF paginated payload with results[] rows matching REQ-004 fields.
- **CON-001**: Follow docs/FE_CONVENTIONS.md service-layer rule: no direct Axios usage in components.
- **CON-002**: Follow docs/FE_PAGE_INVENTORY.md route inventory: /{locale}/admin/notifications remains the canonical route.
- **CON-003**: Preserve existing admin layout navigation wiring in frontend/src/components/layouts/AdminLayout.tsx.
- **CON-004**: Reuse existing Notification model fields event_key and created_by to implement broadcast history without adding a new table.
- **CON-005**: Do not introduce schema migration unless required by implementation dead-end; default plan is no new migration.
- **CON-006**: Keep all user-facing strings in frontend/messages/en.json and frontend/messages/vi.json.
- **CON-007**: Respect document propagation rule from AGENT.md when updating API contracts.
- **GUD-001**: Reuse existing admin hook architecture pattern used by useAdminUsers and useAdminQuizzes.
- **GUD-002**: Reuse existing notification type enum in frontend/src/types/notification.types.ts and backend Notification.NotificationType.
- **GUD-003**: Reuse existing NotificationService.broadcast_notification and extend it with actor and batch-key semantics.
- **PAT-001**: Use dedicated admin hook for create and list state isolation (loading, success, error, pagination).
- **PAT-002**: Keep page file as lightweight server entry that mounts a dedicated client component.
- **PAT-003**: Use deterministic broadcast batch key format broadcast:{uuid4} and persist it into Notification.event_key.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Extend backend domain contract for broadcast history without schema changes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update backend/api/services/notification_service.py function broadcast_notification(payload, actor) to generate broadcast_batch_key = "broadcast:{uuid}" and assign event_key=broadcast_batch_key plus created_by_id=actor.id for all created notification rows. |  |  |
| TASK-002 | Add backend/api/serializers/system.py serializer AdminBroadcastHistoryItemSerializer with fields broadcast_batch_key, type, title, message, metadata, sender, sent_at, recipient_count. |  |  |
| TASK-003 | Add sender sub-shape in serializer as {id, username, email} with nullable support when created_by is null (legacy rows). |  |  |
| TASK-004 | Add backend/api/services/notification_service.py function list_broadcast_history(*, limit, offset) that queries Notification rows where is_broadcast=True and event_key startswith "broadcast:" then groups by event_key and annotates recipient_count, sent_at, title/message/type/metadata, sender fields. |  |  |

### Implementation Phase 2

- GOAL-002: Expose backend admin API endpoint for broadcast history and keep broadcast response backward-compatible.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Update backend/api/views/notifications.py AdminNotificationViewSet.broadcast to pass actor=request.user into service and return {message, recipient_count, broadcast_batch_key}. |  |  |
| TASK-006 | Add new AdminNotificationViewSet action @action(detail=False, methods=['get'], url_path='history') that returns paginated history rows using AdminBroadcastHistoryItemSerializer. |  |  |
| TASK-007 | Keep permission_classes = [IsAuthenticated, HasJWTPermission] and @add_role_granted('Admin') unchanged for both broadcast and history endpoints. |  |  |
| TASK-008 | Update backend/api/tests/test_notification_api.py with new tests for broadcast response containing broadcast_batch_key and history list authorization rules. |  |  |

### Implementation Phase 3

- GOAL-003: Update frontend type/service layer for create plus history endpoints.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Update frontend/src/types/notification.types.ts by adding AdminBroadcastHistoryItem, AdminBroadcastHistoryResponse, BroadcastNotificationPayload, BroadcastNotificationResponse with broadcast_batch_key field. |  |  |
| TASK-010 | Update frontend/src/services/notifications.service.ts by adding broadcastAdminNotification(payload) and listAdminBroadcastHistory(params) using /api/admin/notifications/broadcast/ and /api/admin/notifications/history/. |  |  |
| TASK-011 | Add deterministic service error mapping comments for 400, 401, 403, 5xx branches to support hook error keys. |  |  |

### Implementation Phase 4

- GOAL-004: Implement frontend admin hook and client UI for combined broadcast and history workflows.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create frontend/src/hooks/useAdminNotifications.ts with list state, pagination state, submit mutation state, and functions loadHistory(), submitBroadcast(), loadPage(), refreshHistory(). |  |  |
| TASK-013 | In useAdminNotifications(), after successful submitBroadcast(), prepend or refetch page-1 history so newly created batch appears immediately and lastRecipientCount is updated. |  |  |
| TASK-014 | Create frontend/src/components/features/notifications/AdminNotificationBroadcastClient.tsx with two sections: BroadcastForm and BroadcastHistoryTable. |  |  |
| TASK-015 | BroadcastForm implementation: type Select, title Input, message Textarea, metadata JSON Textarea, confirm dialog, submit button, success banner showing recipient_count and broadcast_batch_key. |  |  |
| TASK-016 | BroadcastHistoryTable implementation: columns sent_at, title, type, sender, recipient_count, message preview, broadcast_batch_key, and pagination controls (previous/next). |  |  |
| TASK-017 | Replace placeholder in frontend/app/[locale]/(admin)/admin/(protected)/notifications/page.tsx with server-entry component that passes locale into AdminNotificationBroadcastClient. |  |  |

### Implementation Phase 5

- GOAL-005: Align i18n, mock layer, and documentation propagation with expanded API contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-018 | Add adminNotifications namespace to frontend/messages/en.json with keys for form, history table, pagination, success state, and error states. |  |  |
| TASK-019 | Add mirrored adminNotifications namespace to frontend/messages/vi.json with identical key tree. |  |  |
| TASK-020 | Update frontend/src/mocks/handlers/notifications.handlers.ts with POST /api/admin/notifications/broadcast/ and GET /api/admin/notifications/history/ handlers, including permission and validation branches. |  |  |
| TASK-021 | Update docs/API.md section 3.7 with new history endpoint contract and extended broadcast response shape. |  |  |
| TASK-022 | Update docs/IMPL_PLAN.md Task 9.5 text to reference explicit history endpoint contract and remove ambiguity. |  |  |
| TASK-023 | Update docs/FE_PAGE_INVENTORY.md admin notifications route status and API call list to include notifications.listAdminBroadcastHistory. |  |  |

### Implementation Phase 6

- GOAL-006: Validate backend and frontend behavior with focused automated checks.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Extend backend/api/tests/test_notification_api.py with history ordering, aggregation correctness, and access-control tests (admin allowed; editor/member forbidden; unauthenticated 401). |  |  |
| TASK-025 | Run pytest backend/api/tests/test_notification_api.py and ensure all tests pass. |  |  |
| TASK-026 | Add frontend hook tests in frontend/src/hooks/__tests__/useAdminNotifications.test.ts for loadHistory and submitBroadcast success/failure flows. |  |  |
| TASK-027 | Add frontend component tests in frontend/src/components/features/notifications/__tests__/AdminNotificationBroadcastClient.test.tsx for validation, confirm-submit, and history rendering. |  |  |
| TASK-028 | Run npm run lint in frontend and resolve all issues introduced by this task scope. |  |  |
| TASK-029 | Run npx tsc --noEmit in frontend and resolve all new type errors introduced by this task scope. |  |  |
| TASK-030 | Run npm run build in frontend and ensure /[locale]/admin/notifications compiles without runtime boundary issues. |  |  |

## 3. Alternatives

- **ALT-001**: Introduce a new notification_broadcast table for history. Not chosen because existing Notification.event_key and created_by fields can represent broadcast batches without schema migration.
- **ALT-002**: Infer history rows by grouping on created_at/title/message only. Not chosen because grouping collisions are possible; batch key is deterministic and safer.
- **ALT-003**: Keep history as frontend-only local cache after each broadcast. Not chosen because page refresh would lose data and fails operator audit needs.
- **ALT-004**: Split Task 9.5 into two separate deliveries (create now, history later). Not chosen because scope has been explicitly expanded by user decision.

## 4. Dependencies

- **DEP-001**: docs/IMPL_PLAN.md (Slice 9 Task 9.5 target scope).
- **DEP-002**: docs/STATUS.md (tracks Slice 9 completion state and pending task).
- **DEP-003**: docs/API.md section 3.7 (notification API contract baseline).
- **DEP-004**: docs/prd/07-notification.md (feature requirements and MVP scope).
- **DEP-005**: docs/FE_CONVENTIONS.md (service/hook/component architecture rules).
- **DEP-006**: docs/FE_PAGE_INVENTORY.md (route placement and status tracking).
- **DEP-007**: backend/api/views/notifications.py (AdminNotificationViewSet.broadcast response semantics).
- **DEP-008**: backend/api/serializers/system.py (NotificationBroadcastSerializer payload semantics).
- **DEP-009**: backend/api/models.py Notification model fields event_key, is_broadcast, created_by.
- **DEP-010**: backend/api/services/notification_service.py broadcast flow and realtime push behavior.

## 5. Files

- **FILE-001**: backend/api/services/notification_service.py - Add batch-key actor-aware broadcast and history query helper.
- **FILE-002**: backend/api/serializers/system.py - Add AdminBroadcastHistoryItemSerializer and sender sub-serializer.
- **FILE-003**: backend/api/views/notifications.py - Extend broadcast response and add history action endpoint.
- **FILE-004**: backend/api/tests/test_notification_api.py - Add API regression tests for history and extended broadcast response.
- **FILE-005**: frontend/app/[locale]/(admin)/admin/(protected)/notifications/page.tsx - Replace placeholder with client entry wiring.
- **FILE-006**: frontend/src/components/features/notifications/AdminNotificationBroadcastClient.tsx - New admin broadcast+history UI component.
- **FILE-007**: frontend/src/hooks/useAdminNotifications.ts - New admin notifications hook for create and list.
- **FILE-008**: frontend/src/services/notifications.service.ts - Add admin broadcast and history API methods.
- **FILE-009**: frontend/src/types/notification.types.ts - Add broadcast and history DTO contracts.
- **FILE-010**: frontend/src/mocks/handlers/notifications.handlers.ts - Add/adjust admin broadcast and history handlers.
- **FILE-011**: frontend/messages/en.json - Add adminNotifications localized keys.
- **FILE-012**: frontend/messages/vi.json - Add adminNotifications localized keys.
- **FILE-013**: frontend/src/hooks/__tests__/useAdminNotifications.test.ts - Hook behavior tests.
- **FILE-014**: frontend/src/components/features/notifications/__tests__/AdminNotificationBroadcastClient.test.tsx - UI tests.
- **FILE-015**: docs/API.md - Add history endpoint and response contract updates.
- **FILE-016**: docs/IMPL_PLAN.md - Normalize Task 9.5 contract wording with explicit endpoint.
- **FILE-017**: docs/FE_PAGE_INVENTORY.md - Update admin notifications route API call inventory and status.

## 6. Testing

- **TEST-001**: Verify POST /api/admin/notifications/broadcast/ returns message, recipient_count, and broadcast_batch_key.
- **TEST-002**: Verify created broadcast notifications persist event_key=broadcast_batch_key and created_by=admin user for all recipients.
- **TEST-003**: Verify GET /api/admin/notifications/history/ returns grouped rows with accurate recipient_count and sender metadata.
- **TEST-004**: Verify history ordering is sent_at descending.
- **TEST-005**: Verify history endpoint access control: admin allowed, editor/member forbidden, unauthenticated 401.
- **TEST-006**: Verify frontend submitBroadcast sends payload {type,title,message,metadata} and displays recipient_count + batch key.
- **TEST-007**: Verify frontend history table renders API rows and pagination controls correctly.
- **TEST-008**: Verify title/message whitespace-only payload is blocked client-side.
- **TEST-009**: Verify invalid metadata JSON is blocked client-side with deterministic error key.
- **TEST-010**: Verify confirmation dialog is required before sending broadcast request.
- **TEST-011**: Run pytest backend/api/tests/test_notification_api.py and assert pass.
- **TEST-012**: Run npm run lint in frontend and assert pass.
- **TEST-013**: Run npx tsc --noEmit in frontend and assert pass.
- **TEST-014**: Run npm run build in frontend and assert pass.

## 7. Risks & Assumptions

- **RISK-001**: Legacy broadcast rows without event_key or created_by cannot be grouped with full fidelity and may be excluded from new history endpoint.
- **RISK-002**: Batch grouping by event_key assumes no other flow reuses broadcast:* prefix.
- **RISK-003**: Metadata free-form JSON can produce UX confusion if validation feedback is not explicit.
- **RISK-004**: If backend enum values for NotificationType evolve, frontend type list can become stale without synchronized update.
- **RISK-005**: Documentation propagation omissions can reintroduce doc-contract drift.
- **ASSUMPTION-001**: Notification.event_key remains nullable and can store broadcast batch keys safely.
- **ASSUMPTION-002**: Notification.created_by is available on model through FullAudit and accepted in bulk_create rows.
- **ASSUMPTION-003**: Admin access gate and JWT admin_surface claim remain active and unchanged.
- **ASSUMPTION-004**: Expanded Task 9.5 scope includes backend API changes by explicit user direction.

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
- backend/api/models.py
- backend/api/views/notifications.py
- backend/api/services/notification_service.py
- backend/api/serializers/system.py
