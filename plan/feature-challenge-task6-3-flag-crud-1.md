---
goal: Task 6.3 Challenge flag CRUD
version: 1.0
date_created: 2026-04-30
last_updated: 2026-04-30
owner: ILS v2 team
status: 'Planned'
tags: [feature, challenge, api, slice-6]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan delivers Task 6.3: ChallengeFlag CRUD endpoints under `/api/challenge/challenges/{slug}/flags/*`, with secure storage rules for static vs regex flags, and role-gated visibility of `flag_value` for Admin/Editor only.

## 1. Requirements & Constraints

- **REQ-001**: Implement ChallengeFlag list/create/update/delete endpoints under `/api/challenge/challenges/{slug}/flags/` and `/api/challenge/challenges/{slug}/flags/{id}/`.
- **REQ-002**: Store static flags as HMAC-SHA256 hashes (using `settings.SECRET_KEY`); store regex flags as plaintext patterns.
- **REQ-003**: `flag_value` is visible only to Admin/Editor; omit it for Member responses even if access is granted by mistake.
- **REQ-004**: Support multiple flags per challenge with fields `is_regex`, `is_case_sensitive`, `random_tail_length`.
- **REQ-005**: Validate regex patterns on create/update; reject invalid patterns with 400 errors.
- **SEC-001**: Flag checking remains server-side only; do not expose raw static flag values in any response.
- **CON-001**: Use namespaced challenge routes (`/api/challenge/*`) and explicit URL mappings (no router auto-registration for flags).
- **CON-002**: Use `IsAuthenticated` + `HasJWTPermission` and `@add_role_granted('Admin','Editor')` on all flag endpoints.
- **CON-003**: Allow any combination of `random_tail_length`, `is_regex`, and `challenge.instance_required` (no constraint enforcement in Task 6.3).
- **GUD-001**: Follow existing challenge serializer patterns in `backend/api/serializers/challenge.py` and CRUD patterns in `backend/api/views/challenges.py`.
- **PAT-001**: Update `docs/API.md` and `docs/STATUS.md` in the same session after implementation and tests.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add serializers and secure storage rules for ChallengeFlag.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `ChallengeFlagSerializer` (read) and `ChallengeFlagWriteSerializer` (write) in `backend/api/serializers/challenge.py`. Include fields: `id`, `challenge`, `flag_value`, `is_regex`, `is_case_sensitive`, `random_tail_length`, `created_at`, `updated_at`. Implement `to_representation()` to omit `flag_value` unless `ChallengeService.is_editor_or_admin(request.user)` is true. | | |
| TASK-002 | Implement `ChallengeFlagWriteSerializer` validation: (1) `flag_value` non-empty, (2) `random_tail_length >= 0`, (3) `is_regex=true` requires valid regex via `re.compile`, else raise 400. | | |
| TASK-003 | Implement storage normalization inside `ChallengeFlagWriteSerializer`: if `is_regex=false`, store HMAC of `flag_value` (lowercase before hashing when `is_case_sensitive=false`); if `is_regex=true`, store plaintext pattern. On update, re-apply normalization if any of `flag_value`, `is_regex`, or `is_case_sensitive` changes. | | |
| TASK-004 | Export new serializers in `backend/api/serializers/__init__.py` for import parity with existing view modules. | | |

### Implementation Phase 2

- GOAL-002: Add view actions, routes, tests, and documentation updates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Add `flags` and `flag_detail` actions to `LearnChallengeViewSet` in `backend/api/views/challenges.py`: `flags` handles `GET` (list flags) and `POST` (create), `flag_detail` handles `PUT/PATCH/DELETE`. Apply `@add_role_granted('Admin','Editor')` to both actions. Fetch challenge via `self.get_object()` and restrict `ChallengeFlag` queries to that challenge. | | |
| TASK-006 | Wire routes in `backend/api/urls.py` using explicit `re_path` mappings: `/challenge/challenges/{slug}/flags/` → `LearnChallengeViewSet.flags` (`GET/POST`), `/challenge/challenges/{slug}/flags/{flag_id}/` → `LearnChallengeViewSet.flag_detail` (`PUT/PATCH/DELETE`). | | |
| TASK-007 | Add `backend/api/tests/test_challenge_flag_api.py` integration tests: (1) editor can create static flag and stored `flag_value` is HMAC (not raw), (2) editor can create regex flag and stored `flag_value` equals pattern, (3) invalid regex rejected with 400, (4) member receives 403 on list/create/update/delete, (5) `flag_value` omitted for non-admin response if any read path is accidentally exposed. | | |
| TASK-008 | Update `docs/API.md` to mark flag endpoints as `Partial` and confirm role-gated `flag_value` visibility; update `docs/STATUS.md` to mark Task 6.3 completed after delivery and add report reference. | | |

## 3. Alternatives

- **ALT-001**: Store static flags in plaintext for Admin/Editor visibility. Rejected due to security requirement to avoid raw flag exposure.
- **ALT-002**: Enforce `random_tail_length > 0` only when `challenge.instance_required=true`. Rejected per decision to allow any combination in Task 6.3.

## 4. Dependencies

- **DEP-001**: `ChallengeFlag` model in `backend/api/models.py` and `ChallengeService.is_editor_or_admin()` helper.
- **DEP-002**: Permission discovery via `auth_app.services.permission_discovery.discover_permissions()` for new actions.
- **DEP-003**: Challenge routing already namespaced under `/api/challenge/*` (Task 6.1).

## 5. Files

- **FILE-001**: `backend/api/serializers/challenge.py` (add ChallengeFlag serializers + validation + normalization).
- **FILE-002**: `backend/api/serializers/__init__.py` (export new serializers).
- **FILE-003**: `backend/api/views/challenges.py` (add `flags` and `flag_detail` actions).
- **FILE-004**: `backend/api/urls.py` (add flags routes).
- **FILE-005**: `backend/api/tests/test_challenge_flag_api.py` (new integration tests).
- **FILE-006**: `docs/API.md` (flag endpoint status and notes).
- **FILE-007**: `docs/STATUS.md` (mark Task 6.3 completed after delivery).

## 6. Testing

- **TEST-001**: `pytest backend/api/tests/test_challenge_flag_api.py`
- **TEST-002**: `pytest backend/api/tests/test_challenge_api.py` (ensure challenge CRUD unaffected)

## 7. Risks & Assumptions

- **RISK-001**: Admin/Editor will see hashed static flags (not raw); this may reduce UX but preserves security.
- **RISK-002**: Allowing `random_tail_length` without `instance_required` can create unusable flags; callers must enforce logic in Task 6.4.
- **ASSUMPTION-001**: Admin/Editor-only access to flag endpoints is acceptable and matches `docs/API.md`.
- **ASSUMPTION-002**: HMAC with `settings.SECRET_KEY` is sufficient for static flag storage in MVP scope.

## 8. Related Specifications / Further Reading

- `docs/IMPL_PLAN.md` (Slice 6 Task 6.3)
- `docs/prd/04-challenge.md`
- `docs/DATA_MODEL.md` (challenge_flag rules)
- `docs/API.md` (Slice 6 Challenge routes)
