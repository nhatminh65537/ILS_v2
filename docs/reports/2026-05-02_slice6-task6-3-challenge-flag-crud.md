# Session Report: Task 6.3 — ChallengeFlag CRUD

**Date:** 2026-05-02
**Slices / Areas:** Slice 6 – Task 6.3 Challenge Flag CRUD

## Summary

Implemented full CRUD for `ChallengeFlag` under `/api/challenge/challenges/{slug}/flags/` and `/api/challenge/challenges/{slug}/flags/{id}/`. Static flags are stored as HMAC-SHA256 hashes (lowercased first when `is_case_sensitive=false`); regex flags are stored as plaintext patterns and validated at creation/update. The `flag_value` field is visible only to Admin/Editor roles — non-Admin/Editor responses omit it entirely. Access to all flag endpoints is gated to Admin/Editor via `@add_role_granted`. 14 integration tests were written and all pass; no regression in existing challenge test suite (29 tests).

## Completed Items

- Added `ChallengeFlagSerializer` (read, with role-gated `flag_value`) and `ChallengeFlagWriteSerializer` (write, with HMAC normalization + regex validation) to `backend/api/serializers/challenge.py`
- Exported both serializers from `backend/api/serializers/__init__.py`
- Added `flags` (GET list + POST create) and `flag_detail` (PUT/PATCH/DELETE) methods to `LearnChallengeViewSet`
- Wired two new `re_path` entries in `backend/api/urls.py`
- Wrote 14 integration tests in `backend/api/tests/test_challenge_flag_api.py`
- Updated `docs/API.md` flag section to mark `Partial` status with accurate notes
- Updated `docs/STATUS.md` to mark Task 6.3 as completed

## Key Implementations

### HMAC-SHA256 Static Flag Storage

1. `ChallengeFlagWriteSerializer._hmac_flag(value, is_case_sensitive)` — if `is_case_sensitive=False`, lowercases `value` first; then computes `hmac.new(SECRET_KEY, value.encode(), sha256).hexdigest()`
2. `_normalize_flag_value(flag_value, is_regex, is_case_sensitive)` — routes to HMAC for static flags, returns plaintext for regex flags
3. `create()` — pops raw `flag_value` from `validated_data`, applies normalization, then stores; `challenge` FK arrives via `serializer.save(challenge=challenge)` from the view
4. `update()` — only re-normalizes when `flag_value` is explicitly present in the payload (cannot re-hash from a stored hash without the raw value)

### Regex Pattern Validation

1. `validate()` — checks `is_regex=True` presence in incoming attrs (or falls back to `instance.is_regex` for PATCH)
2. Calls `re.compile(flag_value)` and catches `re.error`; raises `ValidationError({'flag_value': ...})` with 400

### Role-Gated `flag_value` Visibility

1. `ChallengeFlagSerializer.to_representation()` — calls `super().to_representation()` to get full data dict
2. Reads `request.user` from serializer context; calls `ChallengeService.is_editor_or_admin(user)`
3. If not Admin/Editor (or no request in context), pops `flag_value` from the dict before returning

### `flags` / `flag_detail` View Actions

1. Both methods decorated with `@add_role_granted('Admin', 'Editor')` — the `HasJWTPermission` fallback path reads this metadata from the handler and enforces DB-level role check when no JWT bitmap is present
2. `flags` resolves the challenge via `self.get_object()` (slug-based lookup), then dispatches on `request.method` (GET → list queryset, POST → write serializer + `save(challenge=challenge)`)
3. `flag_detail` calls `get_object_or_404(ChallengeFlag, id=flag_id, challenge=challenge)` — scopes flag to the challenge, returning 404 if the flag belongs to a different challenge
4. Routes are wired in `urls.py` with `(?P<flag_id>\d+)` named group; `self.kwargs['flag_id']` is implicit via DRF ViewSet kwargs forwarding

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/serializers/challenge.py` | Added `ChallengeFlagSerializer` + `ChallengeFlagWriteSerializer`; added `hashlib`, `hmac`, `ChallengeFlag` imports |
| `backend/api/serializers/__init__.py` | Exported `ChallengeFlagSerializer`, `ChallengeFlagWriteSerializer`; added to `__all__` |
| `backend/api/views/challenges.py` | Added `flags` + `flag_detail` methods; imported `ChallengeFlag`, `ChallengeFlagSerializer`, `ChallengeFlagWriteSerializer`, `get_object_or_404` |
| `backend/api/urls.py` | Added `challenge-flag-list` and `challenge-flag-detail` re_path entries |
| `backend/api/tests/test_challenge_flag_api.py` | New file — 14 integration tests |
| `docs/API.md` | Flag section updated to `Partial` status with accurate endpoint notes |
| `docs/STATUS.md` | Task 6.3 marked completed |

## Notes / Caveats

- **Stored hashes are opaque to editors**: Admin/Editor see the HMAC hex string, not the raw flag. This is intentional per REQ-002/SEC-001. UX implication: editors cannot recover raw flag values — they must delete and re-create if lost.
- **Update without new `flag_value`**: PATCH/PUT without providing `flag_value` leaves the stored hash unchanged; only metadata fields (`is_regex`, `is_case_sensitive`, `random_tail_length`) are updated. If `is_regex` or `is_case_sensitive` changes without a new `flag_value`, the stored hash is technically stale — callers should always supply `flag_value` when changing normalization-affecting fields.
- **`random_tail_length` semantics deferred to Task 6.4**: Any `>= 0` value is accepted without constraint; instance-specific flag generation logic is in Task 6.4 and 6.5.
- **Flag submission endpoint** (`/api/challenge/challenges/{slug}/submit/`) is covered in Task 6.4 — not in scope here.
