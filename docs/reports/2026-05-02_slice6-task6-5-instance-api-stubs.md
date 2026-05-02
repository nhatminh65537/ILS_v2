# Session Report: Slice 6 — Task 6.5 Instance API Stubs (MockDeploymentBackend)

**Date:** 2026-05-02
**Slices / Areas:** Slice 6 – Task 6.5 (Instance API — Wave 1 MockDeploymentBackend)

## Summary

Task 6.5 delivers the challenge instance lifecycle API using a `MockDeploymentBackend`. Per decision Q-CHALL-01 (Option C), Wave 1 provides real DB records with mocked connection info — no external deployment system is required. The `InstanceDeploymentBackend` abstract base class defines the pluggable interface; Wave 2 will swap in `SocketDeploymentBackend` without any API or frontend change. User-facing endpoints (start/stop/status) and admin endpoints (list/kill) are all active.

## Completed Items

- Rewrite `instance_service.py` — `InstanceDeploymentBackend` ABC + `MockDeploymentBackend` + `get_deployment_backend()`
- Update `ChallengeInstance.start()` / `stop()` / `terminate()` to call `get_deployment_backend()` instead of old `InstanceService`
- Add `instance_start` action — `POST /api/challenge/challenges/{slug}/instance/start/` (idempotent)
- Add `instance_stop` action — `POST /api/challenge/challenges/{slug}/instance/stop/`
- Add `instance_status` action — `GET /api/challenge/challenges/{slug}/instance/status/`
- Add `ChallengeInstanceAdminView` — `GET /api/challenge/instances/` with filters
- Add `ChallengeInstanceKillView` — `POST /api/challenge/instances/{id}/kill/`
- Update `ChallengeInstanceSerializer` — added `expires_at`, `challenge_flag`; excluded `flag_value`
- Register 5 new URL patterns
- Update `docs/API.md`, `docs/STATUS.md`

## Key Implementations

### InstanceDeploymentBackend Strategy Pattern

1. `InstanceDeploymentBackend` (ABC) — defines `deploy(instance) -> dict`, `stop(instance) -> bool`, `terminate(instance) -> bool`
2. `MockDeploymentBackend.deploy()` — checks for flag with `random_tail_length > 0`; generates plaintext instance flag via `FlagValidationService.generate_instance_flag(base_flag, random_tail_length)`; stores in `instance.flag_value` and `instance.challenge_flag`; returns fake `instance_info = {host, port, note}`
3. `get_deployment_backend()` — module-level factory; returns `MockDeploymentBackend()` now; Wave 2 returns `SocketDeploymentBackend()`
4. `ChallengeInstance.start()` — calls `get_deployment_backend().deploy(self)`, sets `status=RUNNING`, stores `instance_info`, calls `self.log()`

### Instance Lifecycle Endpoints

1. `instance_start`: check `challenge.instance_required` (400 if False), call `ChallengeService.get_running_instance()` — if found return existing (idempotent), else `ChallengeService.create_instance()` then `instance.start()`; return `ChallengeInstanceSerializer` with `201`
2. `instance_stop`: get running instance (404 if none), call `instance.stop()` → `status=STOPPED`; return `204`
3. `instance_status`: get latest instance for user by `-created_at`; return serialized instance or `{"status": "none"}`

### Admin Endpoints

1. `ChallengeInstanceAdminView.get()` — filter by `challenge`, `user`, `status` query params; ordered by `-created_at`
2. `ChallengeInstanceKillView.post()` — get by pk, guard against already-terminated, call `instance.terminate()` → `status=TERMINATED`, `terminated_at` set; return `204`

## Files Changed

| File | Change Summary |
|------|---------------|
| `backend/api/services/instance_service.py` | Full rewrite — `InstanceDeploymentBackend` ABC + `MockDeploymentBackend` + `get_deployment_backend()` |
| `backend/api/models.py` | Updated `ChallengeInstance.start/stop/terminate` to use `get_deployment_backend()` |
| `backend/api/serializers/challenge.py` | Updated `ChallengeInstanceSerializer`: added `expires_at`, `challenge_flag`; excluded `flag_value` |
| `backend/api/views/challenges.py` | Added `instance_start`, `instance_stop`, `instance_status` actions + `ChallengeInstanceAdminView` + `ChallengeInstanceKillView` |
| `backend/api/views/__init__.py` | Exported `ChallengeInstanceAdminView`, `ChallengeInstanceKillView` |
| `backend/api/urls.py` | Registered 5 instance route URL patterns |
| `docs/API.md` | Marked instance endpoints as `Stable`; updated notes |
| `docs/STATUS.md` | Marked Task 6.5 as completed |

## Notes / Caveats

- **Wave 2 swap**: Only change needed is `get_deployment_backend()` to return `SocketDeploymentBackend()`. No API, serializer, or frontend change required.
- **Instance TTL (`expires_at`)**: Field exists on model but is not set by `MockDeploymentBackend`. Wave 2 should populate it from `system_config` (e.g., `challenge.instance.ttl_minutes`).
- **Instance flag when `random_tail_length == 0`**: `MockDeploymentBackend` does not set `flag_value`; submission falls back to comparing against static/regex `ChallengeFlag` records as normal.
- **Concurrent start race**: DB-level `UniqueConstraint(condition=Q(status='running'))` enforces the 1-running-instance-per-user-per-challenge invariant. If two concurrent requests both pass the get_running_instance check, only one will succeed at `create_instance`; the other will raise `IntegrityError` (currently unhandled — production hardening for Wave 2).
