---
goal: Feature plan for Slice 8 Task 8.1 User Profile API
version: 1.1
date_created: 2026-04-02
last_updated: 2026-04-02
owner: Backend Team A
status: Planned
tags: [feature, backend, api, user-profile, activity, slice-8, task-8.1]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines deterministic implementation steps for Slice 8 Task 8.1 in ILS_v2. Scope includes all six required endpoints in docs IMPL_PLAN: own profile read and update, own settings update, own account update, own activity feed, public profile by username, and public activity feed by username. This plan excludes admin user management (Task 8.2), frontend profile pages (Task 8.3), and statistics leaderboard features (Slice 11).

## 1. Requirements & Constraints

- REQ-001: Implement GET /api/users/me/profile/ to return authenticated user profile and stats counters from UserProfile.
- REQ-002: Implement PATCH /api/users/me/profile/ to update only editable profile fields: display_name, avatar_url, bio, location, website, entry_year.
- REQ-003: Implement PATCH /api/users/me/settings/ to update only language, theme, timezone.
- REQ-004: Implement PATCH /api/users/me/account/ to update username and email with uniqueness checks and deterministic field errors.
- REQ-005: Implement GET /api/users/me/activity/ to return latest 30 own activity events sorted by timestamp descending.
- REQ-006: Implement GET /api/users/{username}/profile/ to return public profile data only.
- REQ-007: Implement GET /api/users/{username}/activity/ to return latest 30 public activity events for target user sorted by timestamp descending.
- REQ-008: Activity event schema must include at minimum: type, timestamp, item_title, and source reference id when available.
- REQ-009: For own profile endpoints, auto-create missing UserProfile with defaults before read or update.
- SEC-001: Public profile and public activity responses must not expose private fields such as email, session info, token data, or internal moderation metadata.
- SEC-002: All me endpoints must derive identity from request.user only; no user id input accepted.
- SEC-003: Prevent mass assignment using dedicated serializers per endpoint group: profile, settings, account, activity response.
- API-001: Maintain routing under api users namespace in backend api urls and backend api views users.
- API-002: Unknown username for public endpoints returns HTTP 404.
- API-003: Account update validation errors return HTTP 400 with stable keys username or email.
- API-004: me endpoints require authentication; public username endpoints allow read-only anonymous access.
- CON-001: Follow AGENT workflow and resolve any OPEN blockers in docs DECISIONS before execution.
- CON-002: Follow docs DATA_MODEL as authoritative schema; no schema drift.
- CON-003: Keep functional-first priority per docs IMPL_PLAN and R-DEV-02.
- GUD-001: Reuse existing UserViewSet pattern in backend api views users.
- GUD-002: Reuse existing UserProfile model in backend api models.
- GUD-003: Reuse Notification and AuditLog models where suitable for activity projection; do not add new tables in Task 8.1 unless blocked by acceptance criteria.
- PAT-001: Query optimization must use select_related for user profile fetch paths.
- PAT-002: Activity feed query must be deterministic with explicit ordering and limit.
- OPS-001: Add focused endpoint tests for Task 8.1 in dedicated test module and run targeted pytest commands.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Finalize endpoint contracts and data projection strategy for profile and activity.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Define serializer matrix in backend/api/serializers.py with explicit classes: MeProfileReadSerializer, MeProfileUpdateSerializer, MeSettingsUpdateSerializer, MeAccountUpdateSerializer, PublicProfileSerializer, ActivityEventSerializer. |  |  |
| TASK-002 | Define deterministic activity projection source in backend/api/services or backend/api/views/users.py using existing models with explicit fallback priority: AuditLog first, then Notification for user-learning events if AuditLog records are absent. |  |  |
| TASK-003 | Define event type mapping dictionary for lesson_complete, challenge_solve, quiz_complete with exact source field mapping and stable output labels. |  |  |
| TASK-004 | Add account validation rules in MeAccountUpdateSerializer: exclude current user in unique checks for username and email and return field-scoped errors. |  |  |

### Implementation Phase 2

- GOAL-002: Implement me endpoints for profile, settings, account, and activity.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Refactor backend/api/views/users.py action profile to support GET and PATCH on path users/me/profile using MeProfileReadSerializer for GET and MeProfileUpdateSerializer for PATCH. |  |  |
| TASK-006 | Add PATCH users/me/settings action in backend/api/views/users.py using MeSettingsUpdateSerializer and restricted writable fields language, theme, timezone. |  |  |
| TASK-007 | Add PATCH users/me/account action in backend/api/views/users.py using MeAccountUpdateSerializer and transactional save for username and email updates. |  |  |
| TASK-008 | Add GET users/me/activity action in backend/api/views/users.py returning max 30 events ordered by timestamp desc using ActivityEventSerializer and projection service. |  |  |
| TASK-009 | Add profile get_or_create guard helper inside UserViewSet for me endpoints to guarantee UserProfile existence. |  |  |

### Implementation Phase 3

- GOAL-003: Implement public username endpoints for profile and activity.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Add GET users/{username}/profile endpoint wiring in backend/api/urls.py and backend/api/views/users.py with username lookup and PublicProfileSerializer response. |  |  |
| TASK-011 | Add GET users/{username}/activity endpoint wiring in backend/api/urls.py and backend/api/views/users.py with username lookup and ActivityEventSerializer response limited to 30 newest events. |  |  |
| TASK-012 | Enforce 404 behavior for unknown username across both public endpoints with consistent error payload shape. |  |  |
| TASK-013 | Enforce data minimization in public serializers to exclude private account fields and internal-only counters not required by PRD. |  |  |

### Implementation Phase 4

- GOAL-004: Stabilize permissions, compatibility, and deterministic responses.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Update UserViewSet get_permissions in backend/api/views/users.py so create remains AllowAny, me endpoints require IsAuthenticated, and public username read endpoints allow anonymous read-only access. |  |  |
| TASK-015 | Preserve existing GET users/me/profile response compatibility for current frontend clients by maintaining key names already consumed. |  |  |
| TASK-016 | Add explicit ordering and limit constants for activity responses in backend/api/constants.py or local module constants to prevent nondeterministic behavior. |  |  |
| TASK-017 | Add pagination decision note for activity feed: Task 8.1 fixed limit 30, no page query parameters in this task. |  |  |

### Implementation Phase 5

- GOAL-005: Add test coverage and workflow documentation closure.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-018 | Create backend/api/test_profile_task8_1.py with tests for GET and PATCH users/me/profile including allowed and forbidden field updates. |  |  |
| TASK-019 | Add tests for PATCH users/me/settings and PATCH users/me/account including duplicate username, duplicate email, invalid email, and unchanged-value idempotent updates. |  |  |
| TASK-020 | Add tests for GET users/me/activity and GET users/{username}/activity covering limit 30, ordering desc, no private leakage, and unknown username 404 on public path. |  |  |
| TASK-021 | Add tests for GET users/{username}/profile verifying public field contract and hidden private fields. |  |  |
| TASK-022 | Run pytest backend/api/test_profile_task8_1.py and targeted regression tests in backend/auth_app/tests.py related to profile creation paths. |  |  |
| TASK-023 | Update docs/STATUS.md, docs/API.md, and docs/reports/2026-04-02_slice8-task8-1-user-profile-api.md in same execution session to satisfy AGENT documentation workflow. |  |  |

## 3. Alternatives

- ALT-001: Use separate APIView classes in new backend/api/views/user_profile.py instead of extending UserViewSet. Rejected because existing users domain routing and maintenance conventions are ViewSet-based.
- ALT-002: Build activity feed only from Notification table. Rejected because Notification may miss some canonical domain events and is not guaranteed complete event history.
- ALT-003: Build activity feed only from AuditLog table. Rejected as sole source due to possible incomplete event writes in current code paths; fallback projection needed for Task 8.1 reliability.
- ALT-004: Include pagination and filters for activity endpoints in Task 8.1. Rejected due to functional-first scope and fixed contract requiring last 30 events.

## 4. Dependencies

- DEP-001: docs/IMPL_PLAN.md Slice 8 Task 8.1 endpoint contract.
- DEP-002: docs/prd/06-user-profile.md requirements FR-PROF-01 through FR-PROF-05 and acceptance criteria.
- DEP-003: backend/api/models.py classes User, UserProfile, Notification, AuditLog and progress models.
- DEP-004: backend/api/views/users.py UserViewSet current me and profile actions.
- DEP-005: backend/api/serializers.py existing UserProfileSerializer and user serializers.
- DEP-006: backend/api/urls.py router and custom path wiring.
- DEP-007: backend/auth_app/views.py and backend/auth_app/services/sso_service.py profile creation flows for new users.

## 5. Files

- FILE-001: backend/api/views/users.py — implement and wire endpoint actions for me profile settings account activity and public username profile activity.
- FILE-002: backend/api/serializers.py — add endpoint-specific serializers and validation logic.
- FILE-003: backend/api/urls.py — add explicit username-based profile and activity routes if not fully representable through DRF action routing.
- FILE-004: backend/api/test_profile_task8_1.py — add new tests for full Task 8.1 endpoint matrix.
- FILE-005: backend/api/constants.py — add activity response constants if needed.
- FILE-006: docs/API.md — update endpoint documentation and response contracts in same session.
- FILE-007: docs/STATUS.md — update task lifecycle state and completion notes.
- FILE-008: docs/reports/2026-04-02_slice8-task8-1-user-profile-api.md — add required session report.
- FILE-009: plan/feature-user-profile-task8-1-user-profile-api-1.md — canonical plan file for workspace plan directory.

## 6. Testing

- TEST-001: Authenticated GET /api/users/me/profile returns 200 and includes expected stats counters.
- TEST-002: PATCH /api/users/me/profile updates display_name bio avatar_url location website entry_year and rejects counter field writes.
- TEST-003: PATCH /api/users/me/settings updates language theme timezone and rejects unrelated fields.
- TEST-004: PATCH /api/users/me/account success path updates username and email atomically.
- TEST-005: PATCH /api/users/me/account duplicate username returns 400 with username key.
- TEST-006: PATCH /api/users/me/account duplicate email returns 400 with email key.
- TEST-007: GET /api/users/me/activity returns maximum 30 events sorted descending by timestamp with stable schema keys.
- TEST-008: GET /api/users/{username}/profile returns 200 for existing user and excludes private fields.
- TEST-009: GET /api/users/{username}/activity returns 200 for existing user, 404 for unknown user, and excludes private fields.
- TEST-010: Anonymous access to all me endpoints returns auth failure status according to project auth settings.
- TEST-011: Execute pytest backend/api/test_profile_task8_1.py.
- TEST-012: Execute targeted regression pytest backend/auth_app/tests.py for registration and SSO profile creation compatibility.

## 7. Risks & Assumptions

- RISK-001: Activity event completeness can vary if current domain flows do not consistently write AuditLog or Notification records.
- RISK-002: Username-based public routes can conflict with existing numeric user detail patterns if route precedence is not explicit.
- RISK-003: Serializer refactor can unintentionally change existing me profile response keys and break frontend consumers.
- RISK-004: Lack of index on event timestamp and actor fields can impact activity endpoint latency under large datasets.
- ASSUMPTION-001: Task 8.1 includes both profile and activity endpoints exactly as listed in docs IMPL_PLAN Slice 8 Task 8.1.
- ASSUMPTION-002: Database schema for UserProfile and event source models already exists and does not require migration in this task.
- ASSUMPTION-003: Email verification flow for account email change is out of scope for this task unless explicitly required in current sprint execution.

## 8. Related Specifications / Further Reading

- docs/IMPL_PLAN.md
- docs/prd/06-user-profile.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/CONFIG.md
- docs/STATUS.md
- docs/DECISIONS.md
- AGENT.md
- DEV_WORKFLOW.md
