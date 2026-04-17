# Session Report: Slice 9 Task 9.2 - Auto-trigger Notification Signals

**Date:** 2026-04-17
**Slices / Areas:** Slice 9 - Notifications

## Summary

Implemented backend-only auto-trigger notification signals for course, challenge, and quiz completion. The notification model now supports idempotent event-key deduplication, and the existing completion paths were wired into a shared notification creation helper. Focused signal tests and adjacent regressions passed.

## Completed Items

- Added `event_key` to the `notification` model with a uniqueness constraint on `(user, event_key)`.
- Added `NotificationService.create_notification()` to centralize auto-notification creation and deduplication.
- Wired course completion notifications into `LearnProgressService.recompute_course_progress()` and `backend/api/signals.py`.
- Refactored challenge completion to use the shared notification helper instead of direct model creation.
- Extended the quiz attempt signal to emit a quiz completion notification on the first `completed_at` transition.
- Added focused signal regression tests for course, challenge, quiz, and helper idempotency.
- Verified the backend with `pytest api/tests/test_notification_signals.py -q`, `pytest api/tests/test_notification_api.py api/tests/test_quiz_progress_signal.py api/tests/test_learn_progress_api.py -q`, and `python manage.py check`.

## Key Implementations

The implementation uses a single deduplication primitive in `NotificationService.create_notification()`. Auto notifications are keyed by stable `event_key` values derived from the user and target resource, so repeated signal execution does not create duplicates.

Course completion follows the existing lesson-to-course recompute pipeline. The signal handler now asks `LearnProgressService.recompute_course_progress()` whether the course crossed into its first completed state, and only then creates a course notification.

Challenge completion now routes through the shared helper after the first successful completion save. Quiz completion remains inside the existing attempt signal and emits only when `UserQuizProgress.completed_at` transitions from unset to set.

## Validation

- `pytest api/tests/test_notification_signals.py -q`
- `pytest api/tests/test_notification_api.py api/tests/test_quiz_progress_signal.py api/tests/test_learn_progress_api.py -q`
- `python manage.py check`

## Notes

WebSocket delivery and frontend notification surfaces remain out of scope for Task 9.2 and stay aligned with Slice 9 Tasks 9.3+.