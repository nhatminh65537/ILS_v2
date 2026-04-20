# Session Report: Slice 9 Task 9.4 - Frontend Notification Bell and Inbox

**Date:** 2026-04-20
**Slices / Areas:** Slice 9 - Notifications (Task 9.4), Frontend user surface, API contract alignment

## Summary

Implemented the user-facing notification experience for Slice 9 Task 9.4 end-to-end: realtime bell in session navigation, inbox page at `/{locale}/notifications`, mark-read and mark-all-read actions, and shared socket/data hooks. Frontend contracts were normalized to backend runtime APIs using hyphenated action endpoints, with matching MSW fixtures/handlers and synchronized docs (PRD/API/Status/FE inventory).

## Completed Items

- Delivered `NotificationBell` UI with unread badge and latest-5 dropdown preview.
- Integrated bell into user session controls in navbar trailing area.
- Replaced notifications skeleton page with functional inbox client (`NotificationsInboxClient`).
- Added reusable hooks: `useNotifications` for data/actions and `useNotificationSocket` for realtime stream.
- Normalized notification frontend contract to backend runtime fields (`type`, `message`, `metadata`, `read_at`) and DRF pagination shape.
- Updated notification service endpoints to hyphenated actions: `mark-read`, `mark-all-read`, `unread-count`.
- Updated MSW fixtures and handlers to match new contract and response keys (`updated_count`).
- Updated docs: `docs/prd/07-notification.md`, `docs/API.md`, `docs/FE_PAGE_INVENTORY.md`, `docs/STATUS.md`.
- Validation gates passed: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Key Implementations

### Realtime Notification Socket Flow

1. Resolve websocket URL with priority `NEXT_PUBLIC_WS_URL`; fallback from `NEXT_PUBLIC_API_URL` to `/ws/notifications/`.
2. Open socket only when authenticated and realtime is enabled.
3. Send first-message auth payload `{ "type": "auth", "token": "..." }` on `onopen`.
4. Transition socket state via `auth_ok`, `error`, and close-event handling.
5. Map auth close codes (`4001`, `4008`) to auth-required UI error key.
6. Upsert incoming `notification` events into store for immediate bell/inbox refresh.

### Notification Store Deterministic State Model

1. Add canonical sort strategy: unread-first, then `created_at` desc, then `id` desc fallback.
2. Centralize unread computation from current notification state.
3. Add `upsertRealtimeNotification()` to merge or prepend by `id` deterministically.
4. Keep read mutations optimistic (`markAsRead`, `markAllAsRead`) with `read_at` stabilization.
5. Expose `setUnreadCount()` for count endpoint synchronization.

### Bell and Inbox User Experience Delivery

1. Bell dropdown loads top notifications and unread counter on mount.
2. Bell action marks single item read and refreshes unread counter.
3. Inbox route renders paginated list with loading/empty/error states.
4. Inbox supports mark-single and mark-all-read actions with state/store sync.
5. Locale-aware date formatting and i18n strings are applied across bell/inbox.

### Contract and Documentation Normalization

1. Replace underscore action paths with hyphenated backend runtime paths.
2. Align frontend DTO fields and list response to serializer + DRF pagination.
3. Update PRD-07 examples/endpoints to active runtime contract.
4. Update API pending note: only Task 9.5 remains in Slice 9 frontend.
5. Update status/inventory trackers to mark Task 9.4 implemented.

## Files Changed

| File | Change Summary |
|------|----------------|
| `frontend/src/hooks/useNotificationSocket.ts` | Added websocket auth/connect/error handling for notification realtime stream. |
| `frontend/src/hooks/useNotifications.ts` | Added shared notification data/actions hook with store integration. |
| `frontend/src/components/features/notifications/NotificationBell.tsx` | Added bell dropdown UI, unread badge, top-5 preview, open inbox link. |
| `frontend/src/components/features/notifications/NotificationsInboxClient.tsx` | Added inbox client UI with pagination, mark read/all, loading/empty/error states. |
| `frontend/src/components/layouts/SessionNavControls.tsx` | Integrated notification bell into authenticated session controls. |
| `frontend/app/[locale]/(app)/notifications/page.tsx` | Replaced skeleton with inbox client mount. |
| `frontend/src/services/notifications.service.ts` | Normalized endpoints and added unread-count API helper. |
| `frontend/src/types/notification.types.ts` | Normalized notification DTO types to backend serializer shape. |
| `frontend/src/stores/notifications.store.ts` | Added deterministic sorting, realtime upsert, unread count actions. |
| `frontend/src/mocks/data/fixtures.ts` | Updated notification fixtures to new DTO fields. |
| `frontend/src/mocks/handlers/notifications.handlers.ts` | Updated mock endpoints/response keys to hyphenated contract and unread-count route. |
| `frontend/messages/en.json` | Added notifications inbox/bell/error i18n keys (EN). |
| `frontend/messages/vi.json` | Added notifications inbox/bell/error i18n keys (VI). |
| `docs/prd/07-notification.md` | Synchronized PRD endpoint and payload examples with runtime implementation. |
| `docs/API.md` | Added contract alignment note and updated Slice 9 pending note. |
| `docs/FE_PAGE_INVENTORY.md` | Marked notifications route implemented and updated API surface annotation. |
| `docs/STATUS.md` | Marked Slice 9 Task 9.4 completed; added report evidence entry. |
| `openmemory.md` | Added project memory entries for Task 9.4 component/status/pattern updates. |
| `plan/feature-notification-task9-4-frontend-bell-inbox-1.md` | Added implementation plan for Task 9.4 execution tracking. |

## Notes / Caveats

- Admin notification broadcast UI (`/{locale}/admin/notifications`) remains Task 9.5 and is still pending.
- Task 9.4 validation covered type/lint/build gates; no dedicated Slice 9 Playwright checklist was added in this session.
