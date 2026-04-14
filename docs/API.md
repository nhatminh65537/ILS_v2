# API.md — ILS v2 API Reference

> Canonical API reference for the current implementation progress.
> Last updated: 2026-04-14

---

## 1. Scope and Source of Truth

This document includes only API endpoints that match current project progress.

Inclusion rules:
- Include endpoints currently exposed by active backend routing.
- Mark endpoints as `Stable` or `Partial` based on implementation maturity.
- Keep a separate `Planned` section for slice contracts not implemented yet.
- Keep a separate `Deferred` section for explicitly postponed features.

Exclusion rules:
- Exclude old/legacy API patterns not aligned with current slice progress.
- Exclude unimplemented contracts from active endpoint tables.
- Exclude AI endpoints from active APIs while AI slice remains deferred.

Primary references:
- Runtime routing: `backend/backend/urls.py`, `backend/api/urls.py`, `backend/auth_app/urls.py`
- Endpoint behavior: `backend/api/views.py`, `backend/auth_app/views.py`
- Project progress gate: `docs/STATUS.md`, `docs/IMPL_PLAN.md`

Compatibility note:
- Section 3 lists currently active runtime routes. Legacy flat routes (e.g., `/api/quizzes/*`) have been removed and return 404.
- Target feature contracts for upcoming slices follow namespaced routes (`/api/learn/*`, `/api/challenge/*`, `/api/quiz/*`) and are tracked in Section 4 + `docs/IMPL_PLAN.md`.

---

## 2. Global Conventions

- Base prefix: `/api/`
- Default auth: `Bearer <access_token>`
- Default DRF permission: authenticated users (`IsAuthenticated`) unless endpoint overrides it
- Default pagination: page size `20`
- JSON only responses by default

### Auth behavior in current code

- Active auth endpoints are served by `auth_app` under `/api/auth/*`.
- Current JWT access lifetime in code: `15 minutes`
- Current JWT refresh lifetime in code: `7 days`
- Token refresh endpoint for auth_app flow is active with session hash validation, token rotation, and per-user refresh rate limit (10 requests/minute).
- Active access-token permission claims: `permissions` (base64 bitmap, 32 bytes decoded) and `pv` (per-user permission version).

### Authorization bootstrap behavior in current code

- Permission records are auto-discovered at startup from decorated class-based endpoints.
- Permission name format is lowercase: `{app_label}.{resource_name}.{handler_method_name}`.
- `resource_name` is derived from class name by removing `ViewSet`/`View`/`APIView`/`GenericViewSet` then normalizing to snake_case.
- `handler_method_name` is the Python route handler name (`list`, `retrieve`, `tree`, `submit_flag`, `get`, `post`, ...).
- Built-in role mappings are synchronized from `@add_role_granted(...)` metadata.
- Slice 2 Phase 1 contract: role mapping uses explicit handler decorators, with precedence `handler-level` > `class-level`.
- For default mixin handlers needing specific roles, use explicit method override + `super()` call and attach `@add_role_granted(...)` on that handler.

---

## 3. Active Endpoints

Legend:
- `Stable`: route and handler are present and behavior is mostly complete for current scope.
- `Partial`: route is callable but handler depends on unfinished method/service or broader slice work.

### 3.1 Authentication

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register/` | No | Stable | Creates user + profile, auto-assigns Member role, returns access/refresh tokens. |
| POST | `/api/auth/login/` | No | Stable | Local login with cache-based rate limit and session creation. |
| POST | `/api/auth/token/refresh/` | No | Stable | Validates refresh hash in `user_session`, rotates refresh token/session, and enforces per-user refresh rate limit (10/min). |
| POST | `/api/auth/logout/` | Yes | Stable | Revokes current session by refresh token hash. |
| POST | `/api/auth/logout-all/` | Yes | Stable | Revokes all active sessions for authenticated user. |
| POST | `/api/auth/password/change/` | Yes | Stable | Verifies `current_password`, enforces password policy from `auth.password.*` config, updates password hash, and revokes all active user sessions. |
| GET | `/api/auth/sessions/` | Yes | Stable | Lists active sessions for authenticated user only; excludes `refresh_token_hash`. |
| DELETE | `/api/auth/sessions/{id}/` | Yes | Stable | Revokes one owned active session; returns `204` on success, `404` if not found or not owned. |
| GET | `/api/auth/sso/redirect/` | No | Stable | Builds OIDC authorization URL from system config and returns HTTP redirect to Authentik. |
| GET | `/api/auth/sso/callback/` | No | Stable | Validates OIDC state/nonce, exchanges auth code, links/creates user, and returns access/refresh tokens. |
| POST | `/api/auth/identity/link/` | Yes | Stable | Links authenticated user to an external identity (`provider`, `external_id`) with conflict protection and idempotent retry behavior. |

Contract notes for frontend integration (completed slices):
- `GET /api/auth/sso/redirect/` should be used as browser navigation target (redirect response), not as JSON API read.
- Auth success payload user object for register/login/sso-callback is minimal: `{id, username, email}`.
- `POST /api/auth/identity/link/` response shape is `{detail, provider, external_id, created}`.

### 3.2 Users

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/users/` | Yes | Stable | List users. |
| POST | `/api/users/` | No | Stable | Create user via `UserCreateSerializer`; profile is auto-created. |
| GET | `/api/users/{id}/` | Yes | Stable | User detail. |
| PUT/PATCH | `/api/users/{id}/` | Yes | Stable | Update user. |
| DELETE | `/api/users/{id}/` | Yes | Stable | Delete user. |
| GET | `/api/users/me/` | Yes | Stable | Current user info. |
| GET | `/api/users/me/profile/` | Yes | Stable | Current user profile + stats. |
| PATCH | `/api/users/me/profile/` | Yes | Stable | Partial update for current profile fields. |
| PATCH | `/api/users/me/settings/` | Yes | Stable | Updates language, theme, and timezone. |
| PATCH | `/api/users/me/account/` | Yes | Stable | Updates username and email with validation. |
| GET | `/api/users/me/activity/` | Yes | Stable | Current user activity feed (latest 30 events). |
| GET | `/api/users/{username}/profile/` | No | Stable | Public profile for a user by username. |
| GET | `/api/users/{username}/activity/` | No | Stable | Public activity feed for a user by username. |
| GET | `/api/admin/users/` | Yes (Admin) | Stable | Admin list users with filters: `is_active`, `date_joined_from`, `date_joined_to`. |
| POST | `/api/admin/users/` | Yes (Admin) | Stable | Admin create user; password is optional; `UserProfile` is auto-created; defaults to `Member` role if `role_ids` is omitted. |
| GET | `/api/admin/users/{id}/` | Yes (Admin) | Stable | Admin user detail with profile and assigned roles. |
| PUT/PATCH | `/api/admin/users/{id}/` | Yes (Admin) | Stable | Admin update user account fields and role assignments; disabling user revokes all active sessions immediately. |

Task 8.2 update (2026-04-02):
- Admin user management API is active under `/api/admin/users/*` via dedicated admin viewset.
- Update responses include user, profile, and role context for direct frontend state refresh.
- Date filters accept `YYYY-MM-DD` or ISO datetime values.

### 3.3 Courses

Historical/runtime note:
- Routes in this subsection are active in current runtime but are considered legacy-flat paths for future slices.
- For all new implementation work, use namespaced target routes from `docs/API_ROUTE_MAPPING.md`.

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/courses/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| POST | `/api/courses/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| GET | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| PUT/PATCH | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| DELETE | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| GET | `/api/courses/{id}/tree/` | Yes | Partial | Runtime route exists; tree integrity rules for full Slice 5 scope are pending. |
| GET | `/api/courses/{id}/progress/` | Yes | Partial | Runtime route exists; full progress-signal contract is pending. |
| POST | `/api/courses/{id}/enroll/` | Yes | Partial | Runtime route exists; full Slice 5 enrollment/progress contract is pending. |

### 3.4 Lessons

Historical/runtime note:
- Routes in this subsection are active in current runtime but are considered legacy-flat paths for future slices.
- For all new implementation work, use namespaced target routes from `docs/API_ROUTE_MAPPING.md`.

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/lessons/` | Yes | Stable | Read-only list endpoint. |
| GET | `/api/lessons/{id}/` | Yes | Stable | Read-only detail endpoint. |
| POST | `/api/lessons/{id}/complete/` | Yes | Partial | Depends on lesson completion method and full progress workflow. |
| GET | `/api/lessons/{id}/render/` | Yes | Partial | Depends on lesson rendering implementation details. |

### 3.5 Challenges

Historical/runtime note:
- Routes in this subsection are active in current runtime but are considered legacy-flat paths for future slices.
- For all new implementation work, use namespaced target routes from `docs/API_ROUTE_MAPPING.md`.

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/challenges/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| POST | `/api/challenges/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| GET | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| PUT/PATCH | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| DELETE | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| POST | `/api/challenges/{id}/submit_flag/` | Yes | Partial | Runtime route exists; full Slice 6 verification/workflow contract is pending. |
| POST | `/api/challenges/{id}/create_instance/` | Yes | Partial | Depends on instance deployment backend/runtime readiness. |

### 3.6 Quizzes

Task 7.1 update (2026-04-01):
- Canonical namespaced routes for quiz CRUD/question/config are now active under `/api/quiz/quizzes/*`.
- Legacy flat routes (`/api/quizzes/*`) have been removed; `GET /api/quizzes/` returns 404.
- Session lifecycle (start/answer/finish) is handled exclusively via WebSocket — see §3.6.1.

Task 7.2 update (2026-04-01):
- QuizNode tree CRUD endpoints are active under `/api/quiz/nodes/*`.
- MVP behavior is folder-only (`is_item=false` enforced); tree operations use dot-separated `path` invariants from `BaseNode`.

Integration note (2026-04-14):
- `QuizViewSet.progress()` exists in backend view code, but route `/api/quiz/quizzes/{id}/progress/` is currently not wired in `backend/api/urls.py`; live request returns `404` until route mapping is added.

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/quiz/quizzes/` | Yes | Partial | Canonical namespaced list endpoint for Slice 7 Task 7.1; members see published quizzes only. |
| POST | `/api/quiz/quizzes/` | Yes | Partial | Canonical namespaced create endpoint; editor/admin role required. |
| GET | `/api/quiz/quizzes/{id}/` | Yes | Partial | Canonical namespaced detail endpoint. |
| PUT/PATCH | `/api/quiz/quizzes/{id}/` | Yes | Partial | Canonical namespaced update endpoint; editor/admin role required. |
| DELETE | `/api/quiz/quizzes/{id}/` | Yes | Partial | Canonical namespaced delete endpoint; editor/admin role required. |
| GET | `/api/quiz/quizzes/{id}/questions/` | Yes | Partial | Canonical namespaced question management list endpoint; editor/admin only. |
| POST | `/api/quiz/quizzes/{id}/questions/` | Yes | Partial | Canonical namespaced question create endpoint; supports single/multi/fill_blank validation. |
| GET | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Canonical namespaced question detail endpoint; editor/admin only. |
| PUT | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Canonical namespaced question update endpoint; editor/admin only. |
| DELETE | `/api/quiz/quizzes/{id}/questions/{qid}/` | Yes | Partial | Canonical namespaced question delete endpoint; syncs `quiz.total_questions`. |
| GET | `/api/quiz/quizzes/{id}/config/` | Yes | Partial | Canonical namespaced per-user config retrieval endpoint. |
| PUT | `/api/quiz/quizzes/{id}/config/` | Yes | Partial | Canonical namespaced per-user config upsert endpoint. |
| GET | `/api/quiz/nodes/` | Yes | Partial | QuizNode root list (`parent IS NULL`) for quiz tree browsing. |
| POST | `/api/quiz/nodes/` | Yes | Partial | QuizNode create endpoint; editor/admin only; MVP folder-only validation. |
| GET | `/api/quiz/nodes/{id}/` | Yes | Partial | QuizNode detail endpoint. |
| PUT/PATCH | `/api/quiz/nodes/{id}/` | Yes | Partial | QuizNode update endpoint; supports rename/reorder/move via `parent`; editor/admin only. |
| DELETE | `/api/quiz/nodes/{id}/` | Yes | Partial | QuizNode delete endpoint; subtree deletion via cascade. |
| GET | `/api/quiz/nodes/{id}/children/` | Yes | Partial | QuizNode lazy children list endpoint. |
| POST | `/api/quiz/nodes/{id}/move/` | Yes | Partial | Explicit move endpoint (`parent_id`), cycle-safe validation. |

### 3.6.1 Quiz WebSocket (Real-time Practice Sessions)

Task 7.3 update (2026-04-01):
- WebSocket consumer for real-time quiz practice sessions fully implemented.
- Protocol: First-message JWT authentication (Q-INFRA-05 Option B); no JWT in URL query string.
- Endpoint: `ws://host/ws/quiz/{quiz_id}/`
- Auth flow: Connect without token → send `{type: "auth", token: "<access_jwt>"}` within 5-second timeout.
- Action protocol: `{"action": "start"|"answer"|"next"}` after authentication.

| Endpoint | Protocol | Auth | Status | Notes |
|---|---|---|---|---|
| `GET ws://host/ws/quiz/{quiz_id}/` | WebSocket | JWT first-message | Stable | Real-time quiz session; first-message auth pattern. |

**First-message auth flow:**
```json
CLIENT → {"type": "auth", "token": "eyJ..."}
SERVER ← {"type": "auth_ok", "user_id": 123, "username": "alice"}
```

**Start attempt:**
```json
CLIENT → {"action": "start"}
SERVER ← {"type": "question", "attempt_id": 789, "question": {...}, "progress": {"current": 1, "total": 10}}
```

**Submit answer (polymorphic by question type):**
```json
// Single-choice
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"option_id": 42}}
SERVER ← {"type": "answer_result", "is_correct": true, "score_obtained": 10, "explanation": "...", "correct_answer": {"option_id": 42}}

// Multi-choice
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"option_ids": [42, 43]}}
SERVER ← {"type": "answer_result", "is_correct": true, "score_obtained": 10, ...}

// Fill-blank
CLIENT → {"action": "answer", "question_id": 5, "answer_data": {"text": "answer text"}}
SERVER ← {"type": "answer_result", "is_correct": true, ...}
```

**Get next question or finish:**
```json
CLIENT → {"action": "next"}
SERVER ← {"type": "question", ...} // if more questions remain
SERVER ← {"type": "finish", "attempt_id": 789, "total_score": 100, "max_score": 100, "duration_sec": 245}
```

**Error event:**
```json
SERVER → {"type": "error", "code": "already_answered", "message": "Question already answered"}
```

### 3.7 Notifications


| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/notifications/` | Yes | Partial | Runtime route exists; Slice 9 signal pipeline + frontend inbox are pending. |
| GET | `/api/notifications/{id}/` | Yes | Partial | Runtime route exists; Slice 9 signal pipeline + frontend inbox are pending. |
| POST | `/api/notifications/{id}/mark_read/` | Yes | Partial | Runtime route exists; Slice 9 signal pipeline + frontend inbox are pending. |

### 3.8 Leaderboard

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/leaderboard/` | Yes | Partial | Service exists; broader statistics slice still pending. |

### 3.9 System Config

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/admin/config/` | Admin | Stable | Admin-only list grouped by `category`; secret values are masked by default. |
| GET | `/api/admin/config/{key}/` | Admin | Stable | Admin-only detail lookup by config key (supports dotted keys); clear secret value requires manual permission. |
| PATCH | `/api/admin/config/{key}/` | Admin | Stable | Admin-only value update with type validation (`bool`, `int`, `string`, `json`, `secret`). |

Notes:
- `PATCH` returns `403` with `{"detail": "Config is not editable"}` when `is_editable=false`.
- Invalid payload type for config `value_type` returns `400` with deterministic validation error.
- Cache for non-runtime config reads is invalidated after successful updates.
- List response is grouped object by `category`: `{[category]: SystemConfig[]}`.
- Secret clear-text read is restricted to principals with manual permission `system.config.view_secret`.
- Frontend admin config page is implemented at locale routes `/vi/admin/config` and `/en/admin/config` using typed service/hook integration.

### 3.10 Authorization / RBAC

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/admin/permissions/` | Admin | Partial | Active read-only permission list endpoint; supports `include_inactive=true` query. |
| GET | `/api/admin/roles/` | Admin | Partial | Active role list endpoint. |
| POST | `/api/admin/roles/` | Admin | Partial | Active custom role creation endpoint. |
| GET | `/api/admin/roles/{id}/` | Admin | Partial | Active role detail endpoint. |
| PUT/PATCH | `/api/admin/roles/{id}/` | Admin | Partial | Active role update endpoint; system role rename blocked. |
| DELETE | `/api/admin/roles/{id}/` | Admin | Partial | Active role delete endpoint; system role delete blocked. |
| GET | `/api/admin/roles/{id}/permissions/` | Admin | Partial | Active assigned-permissions endpoint for role. |
| POST | `/api/admin/roles/{id}/permissions/` | Admin | Partial | Active permission assignment endpoint using payload `{permission_id}`. |
| DELETE | `/api/admin/roles/{id}/permissions/{perm_id}/` | Admin | Partial | Active permission revoke endpoint for role mapping. |
| GET | `/api/users/{id}/roles/` | Admin | Partial | Active endpoint to list roles assigned to a user. |
| POST | `/api/users/{id}/roles/` | Admin | Partial | Active endpoint to assign a role to a user using payload `{role_id}`. |
| DELETE | `/api/users/{id}/roles/{role_id}/` | Admin | Partial | Active endpoint to remove a role from a user. |

Notes:
- Canonical role-permission assignment route is `/api/admin/roles/{id}/permissions/`.
- RBAC endpoints are admin-only and include action-level `HasJWTPermission('<permission_key>')` checks when JWT auth context is present.
- Role-permission and user-role mapping changes invalidate permission cache for affected users.
- Frontend RBAC admin pages are implemented at locale routes `/vi/admin/rbac`, `/en/admin/rbac`, `/vi/admin/rbac/roles/{id}`, and `/vi/admin/rbac/users/{id}/roles` using the same backend contracts.

---

## 4. Planned APIs (Not Implemented Yet)

These contracts are planned by slices and PRDs, but are not active in the current backend routing.

### 4.1 Slice 1 — Authentication

- `POST /api/auth/password/reset/`
- `POST /api/auth/password/reset/confirm/`

Notes:
- Password reset remains deferred by decision `Q-INFRA-03` until email backend setup is finalized.

### 4.2 Slice 2 — Authorization/RBAC
- JWT claims contract for permission checks: `permissions` (base64 bitmap) + `pv` (permission version).
- Endpoint role grant contract: class-level default grant with explicit handler-level decorator overrides.

### 4.3 Slice 3+ Domain APIs

- Additional Learn tree management endpoints
- Additional Challenge node/category endpoints
- Quiz WebSocket/attempt lifecycle endpoints
- Admin statistics endpoints

Planned WS auth contract for Slice 7:
- Client connects to `/ws/quiz/{quiz_id}/` without token in URL.
- Client must send first message `{type: "auth", token: "<access_jwt>"}` within timeout.
- Server closes socket if auth fails or times out.

---

## 5. Deferred APIs

### Slice 10 — AI Assistant

Deferred by project decision. Do not treat as active API.

- Candidate route family: `/api/ai/*`
- Current backend root router does not activate AI URLs.

---

## 6. Error and Security Notes

- Error payload shape is currently endpoint-dependent and will be normalized in later slices.
- System Config secret values are masked by default; clear-text access is limited to principals with manual permission `system.config.view_secret`.
- API documentation must be updated in the same session whenever endpoint routing or serializer contract changes.

---

## 7. Change Control

When endpoint behavior changes:
1. Update this file first (`docs/API.md`).
2. Reconcile progress state in `docs/STATUS.md`.
3. If scope or sequencing changes, update `docs/IMPL_PLAN.md`.
4. If document dependencies change, update `AGENT.md`.
