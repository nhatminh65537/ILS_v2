# Session Report: Slice 9 Task 9.5 Admin Notification Broadcast and History

**Date:** 2026-04-20
**Slices / Areas:** Slice 9 - Notifications (Task 9.5)

## Summary

Implemented Task 9.5 end-to-end with expanded scope: admin broadcast creation UI plus broadcast history delivery. Backend now persists a deterministic broadcast batch key and sender audit fields on each broadcast row, exposes grouped history via `/api/admin/notifications/history/`, and returns `broadcast_batch_key` in broadcast create responses. Frontend admin notifications page now provides form validation + confirm-submit flow + paginated history table, with service/hook/MSW/i18n updates aligned to the new contract.

## Completed Items

- [ implemented backend batch-key broadcast persistence using existing `notification.event_key` and `created_by` fields ]
- [ added admin broadcast history API endpoint with grouped rows and pagination contract ]
- [ extended broadcast response payload with `broadcast_batch_key` ]
- [ added backend regression tests for history aggregation and access control ]
- [ implemented frontend admin notifications page with form submit and history table ]
- [ added frontend service and hook for admin broadcast + history ]
- [ synchronized API and frontend inventory documentation for new contract ]

## Key Implementations

### Backend Broadcast Batch Tracking

1. Generated deterministic `broadcast:{uuid}` batch key during each admin broadcast request.
2. Persisted `event_key=<batch_key>` and `created_by=<request.user>` for all per-recipient notification rows in the bulk create operation.
3. Returned both `recipient_count` and `broadcast_batch_key` in the broadcast response for frontend confirmation and traceability.

### Backend Broadcast History Aggregation

1. Queried `notification` rows where `is_broadcast=true` and `event_key` starts with `broadcast:`.
2. Grouped rows by `event_key` and selected stable display fields (`type`, `title`, `message`, `metadata`, sender projection).
3. Annotated grouped rows with `recipient_count` and `sent_at=max(created_at)` and exposed them via paginated endpoint `/api/admin/notifications/history/`.

### Frontend Admin Broadcast Console

1. Added typed admin service methods (`broadcastAdminNotification`, `listAdminBroadcastHistory`) and DTOs for create/history flows.
2. Implemented `useAdminNotifications` to manage mutation state, history list state, pagination, and status-aware error mapping.
3. Delivered `AdminNotificationBroadcastClient` with validated form, confirm dialog, success banner, and history table with refresh + paging.

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/notification_service.py` | Added actor-aware broadcast batching, batch key persistence, and history aggregation query |
| `backend/api/serializers/system.py` | Added admin history serializers including sender projection |
| `backend/api/serializers/__init__.py` | Exported new admin notification history serializers |
| `backend/api/views/notifications.py` | Extended broadcast response and added `GET /api/admin/notifications/history/` action |
| `backend/api/tests/test_notification_api.py` | Added tests for `broadcast_batch_key`, history grouping, and history authz |
| `frontend/src/types/notification.types.ts` | Added admin broadcast/history DTOs and enum extensions |
| `frontend/src/services/notifications.service.ts` | Added admin broadcast submit and history list API methods |
| `frontend/src/hooks/useAdminNotifications.ts` | Added admin notifications hook for mutation + list + pagination state |
| `frontend/src/components/features/notifications/AdminNotificationBroadcastClient.tsx` | Implemented admin broadcast form and history table UI |
| `frontend/app/[locale]/(admin)/admin/(protected)/notifications/page.tsx` | Wired route to new admin notifications client component |
| `frontend/src/mocks/data/fixtures.ts` | Added admin broadcast history fixture data |
| `frontend/src/mocks/handlers/notifications.handlers.ts` | Added MSW handlers for admin broadcast and history endpoints |
| `frontend/messages/en.json` | Added `adminNotifications` translation namespace |
| `frontend/messages/vi.json` | Added `adminNotifications` translation namespace |
| `docs/API.md` | Updated notification API contract with history endpoint and extended broadcast response |
| `docs/IMPL_PLAN.md` | Clarified Task 9.5 history endpoint contract |
| `docs/FE_PAGE_INVENTORY.md` | Marked admin notifications route implemented and updated API call inventory |
| `docs/STATUS.md` | Updated completion status entries for Task 9.5 |
| `plan/feature-notification-task9-5-admin-broadcast-ui-1.md` | Expanded implementation plan from UI-only to full-stack scope |

## Notes / Caveats

- Broadcast history endpoint intentionally includes rows with `event_key` prefixed `broadcast:`; legacy broadcast rows without batch key are not guaranteed to appear in grouped history.
- No new migration file was introduced by Task 9.5 implementation; runtime requires applying existing migration `api.0008_notification_event_key` on target environments before using admin broadcast/history endpoints.
- Validation executed in this session:
  - `pytest backend/api/tests/test_notification_api.py` (8 passed)
  - `npm run lint` (pass)
  - `npx tsc --noEmit` (pass)
  - `npm run build` (pass)

## Post-Implementation Hotfixes (2026-04-20)

- Fixed next-intl runtime parse error (`INVALID_MESSAGE: MALFORMED_ARGUMENT`) by removing ICU-like braces from `adminNotifications.fields.metadataPlaceholder` in locale messages.
- Fixed duplicated i18n namespace key rendering (`adminNotifications.adminNotifications.errors.*`) by switching admin notifications hook/component error keys to relative namespace keys (`errors.*`) under `useTranslations('adminNotifications')`.
- Resolved backend runtime `OperationalError: table notification has no column named event_key` by applying migration `api.0008_notification_event_key` on the active SQLite dev database.
