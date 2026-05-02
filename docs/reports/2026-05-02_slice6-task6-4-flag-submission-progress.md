# Session Report: Slice 6 — Task 6.4 Flag Submission + Progress API

**Date:** 2026-05-02
**Slices / Areas:** Slice 6 – Task 6.4 (Flag Submission + Progress) + Phase 0 prerequisite fix

## Summary

Task 6.4 delivers the server-side flag submission endpoint and the user challenge progress aggregate endpoint. Before implementing submission logic, a prerequisite design fix was applied: the prior implementation incorrectly stored flag values as HMAC-SHA256 hashes, contradicting the intended design where flags are plaintext and compared directly. All HMAC logic was removed from the serializer, service, and model layers. With that in place, the `POST /submit/` and `GET /progress/` endpoints were implemented.

## Completed Items

- Remove HMAC from `ChallengeFlagWriteSerializer` — `flag_value` now stored as plaintext
- Rewrite `FlagValidationService` — direct string comparison (static), `re.fullmatch` (regex), direct equality (instance)
- Remove `ChallengeFlag.hash_flag()` and `set_flag()` domain methods (dead code)
- Fix `ChallengeService.handle_correct_submission()` — add `challenge_completed += 1` counter; add `Notification(type=CHALLENGE)` with `event_key` deduplication
- Add `submit` action to `LearnChallengeViewSet` — `POST /api/challenge/challenges/{slug}/submit/`
- Add `ChallengeProgressView` — `GET /api/challenge/progress/`
- Register 2 new URL patterns
- Update 14 existing flag tests to expect plaintext storage (all pass)
- Update `docs/DATA_MODEL.md`, `docs/API.md`, `docs/STATUS.md`

## Key Implementations

### Flag Storage Redesign (Prerequisite)

1. `ChallengeFlagWriteSerializer.create()` / `update()` — removed `_normalize_flag_value()` entirely; `flag_value` passed to model as-is
2. `FlagValidationService.validate()` — three branches dispatched by presence of `instance_flag` and `is_regex`:
   - **Instance flag**: `submitted == instance_flag` (always case-sensitive, `is_regex` ignored)
   - **Regex**: `re.fullmatch(flag.flag_value, submitted, re.IGNORECASE if not is_case_sensitive else 0)`
   - **Static**: `submitted == flag.flag_value` or lowercased copies when `is_case_sensitive=False`
3. `ChallengeInstance.flag_value` — stored plaintext; set by `MockDeploymentBackend.deploy()` at instance start

### Flag Submission Flow

1. `submit` action deserializes `{flag}` via `ChallengeFlagSubmitSerializer`
2. If `challenge.instance_required`: fetch running instance via `ChallengeService.get_running_instance()`; return `400` if none
3. Iterate `challenge.flags.all()` — call `flag.validate_submission(submitted, instance.flag_value)` for each; `is_correct = any(match)`
4. `ChallengeService.record_submission()` — always creates `UserChallengeSubmit` regardless of result
5. If `is_correct`: `ChallengeService.handle_correct_submission()` — guarded by `if progress.completed_at: return`, then set `completed_at`, increment `challenge_completed`, increment `total_challenge_point`, call `update_leaderboard_rank()`, create deduplication-safe `Notification`
6. Return `{"correct": bool}`

### handle_correct_submission Fix

1. `UserChallengeProgress.get_or_create()` → early-return if already completed (idempotency)
2. `UserProfile.challenge_completed += 1` (was missing before)
3. `Notification.objects.get_or_create(event_key=f'challenge_complete_{user.id}_{challenge.id}', ...)` — prevents duplicate notifications on re-entry

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/serializers/challenge.py` | Removed `_normalize_flag_value()`, `hmac`/`hashlib` imports; flags stored as plaintext |
| `backend/api/services/flag_validation_service.py` | Full rewrite — direct plaintext comparison, no HMAC |
| `backend/api/services/challenge_service.py` | Fixed `handle_correct_submission`: `challenge_completed++` + deduplication-safe notification |
| `backend/api/views/challenges.py` | Added `submit` action, `ChallengeProgressView` |
| `backend/api/views/__init__.py` | Exported `ChallengeProgressView` |
| `backend/api/urls.py` | Registered `challenge-submit` and `challenge-progress` routes |
| `backend/api/models.py` | Removed `hmac`/`hashlib` imports, removed `hash_flag`/`set_flag`, updated `flag_value` help_text |
| `backend/api/tests/test_challenge_flag_api.py` | Updated 14 tests for plaintext storage |
| `docs/DATA_MODEL.md` | Updated `challenge_flag.flag_value` and `challenge_instance.flag_value` descriptions |
| `docs/API.md` | Updated flag endpoint notes; marked 6.4 endpoints as `Stable` |
| `docs/STATUS.md` | Marked Task 6.4 as completed |

## Notes / Caveats

- **DB re-seed required**: Any `ChallengeFlag` records created before this fix have HMAC-hashed `flag_value`. Dev DB must be re-seeded. No production deployment exists.
- **`challenge_completed` counter was 0 for all previously completed challenges**: The counter was never incremented prior to this fix. Existing users will have an incorrect count; a one-time data migration may be needed before 6.6 frontend ships.
- **Notification deduplication**: Uses `event_key` field (`challenge_complete_{user_id}_{challenge_id}`) via `get_or_create` — safe against double-submission.
