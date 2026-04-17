# Session Report: Slice 9 Task 9.3 - WebSocket Notification Delivery

**Date:** 2026-04-17
**Slices / Areas:** Slice 9 - Notifications, Realtime (Django Channels)

## Summary

Implemented real-time notification delivery over WebSocket at `/ws/notifications/` using first-message JWT authentication (Q-INFRA-05 Option B). Notification creation now triggers per-user channel pushes through `NotificationService`, while preserving event-key deduplication for signal-driven events. Added async consumer tests and validated regressions for notifications and existing quiz websocket flow.

## Completed Items

- Added `NotificationConsumer` in `backend/realtime/consumers/notification_consumer.py`.
- Added route registration in `backend/realtime/routing.py` for `path('ws/notifications/', ...)`.
- Exported `NotificationConsumer` via `backend/realtime/consumers/__init__.py`.
- Extended `NotificationService` with realtime payload serializer and `push_notification_realtime()` group-send helper.
- Updated `NotificationService.create_notification()` to support `return_created` and on-commit realtime push for newly-created notifications.
- Updated `NotificationService.broadcast_notification()` to dispatch realtime events per created user notification.
- Updated signal handlers in `backend/api/signals.py` to request `(notification, created)` and keep idempotent behavior explicit.
- Added async websocket integration tests in `backend/realtime/tests/test_notification_consumer.py`.
- Added hardening tests for broadcast WS fan-out and dedup no-reemit behavior in `backend/realtime/tests/test_notification_consumer.py`.
- Updated `docs/API.md` and `docs/STATUS.md` to mark Task 9.3 complete and document active WS contract.
- Updated `backend/requirements-python.txt` to include missing runtime/test dependencies used by realtime test workflow (`daphne`, `pytest`, `pytest-django`, `pytest-asyncio`).

## Key Implementations

The consumer lifecycle mirrors the existing quiz websocket pattern:

1. Accept connection.
2. Start auth-timeout guard (`5s`).
3. Require first message `{type: "auth", token: "..."}`.
4. Validate JWT using `TokenBackend` and active user lookup.
5. Subscribe socket to `notifications_{user_id}` group.
6. Forward `notification_send` channel events to client payload `{type: "notification", data: ...}`.

Realtime push is triggered from service layer (not from consumer) to keep a single notification-delivery write path. Push dispatch is registered with `transaction.on_commit(...)` so websocket events are emitted only after successful DB commit.

Signal-driven notifications retain stable `event_key` deduplication. Duplicate signal executions still map to a single row and no duplicate realtime events.

Hardening coverage now explicitly verifies two critical edge cases: (1) admin-style broadcast fan-out reaches all active connected users, and (2) repeated `event_key` creation does not emit duplicate websocket events.

## Validation

- `.\.venv\Scripts\python.exe -m pytest backend/realtime/tests/test_notification_consumer.py backend/realtime/tests/test_quiz_consumer.py backend/api/tests/test_notification_api.py backend/api/tests/test_notification_signals.py -q`
- `..\.venv\Scripts\python.exe manage.py check` (run from `backend/`)

## Notes

Environment required `daphne` and `pytest-asyncio` for async Channels test collection/execution. These dependencies are now reflected in backend requirements to avoid repeat setup failures.
