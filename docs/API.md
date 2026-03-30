# API.md — ILS v2 API Reference

> Canonical API reference for the current implementation progress.
> Last updated: 2026-03-30

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
| GET | `/api/auth/sso/redirect/` | No | Stable | Builds OIDC authorization URL from system config and returns HTTP redirect to Authentik. |
| GET | `/api/auth/sso/callback/` | No | Stable | Validates OIDC state/nonce, exchanges auth code, links/creates user, and returns access/refresh tokens. |
| POST | `/api/auth/identity/link/` | Yes | Stable | Links authenticated user to an external identity (`provider`, `external_id`) with conflict protection and idempotent retry behavior. |

### 3.2 Users

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/users/` | Yes | Stable | List users. |
| POST | `/api/users/` | No | Stable | Create user via `UserCreateSerializer`; profile is auto-created. |
| GET | `/api/users/{id}/` | Yes | Stable | User detail. |
| PUT/PATCH | `/api/users/{id}/` | Yes | Stable | Update user. |
| DELETE | `/api/users/{id}/` | Yes | Stable | Delete user. |
| GET | `/api/users/me/` | Yes | Stable | Current user info. |
| GET | `/api/users/profile/` | Yes | Stable | Current user profile. |
| PATCH | `/api/users/update_profile/` | Yes | Stable | Partial update for current profile. |

### 3.3 Courses

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/courses/` | Yes | Stable | Supports `status`, `category`, `search`. |
| POST | `/api/courses/` | Yes | Stable | Create course. |
| GET | `/api/courses/{id}/` | Yes | Stable | Course detail view. |
| PUT/PATCH | `/api/courses/{id}/` | Yes | Stable | Update course. |
| DELETE | `/api/courses/{id}/` | Yes | Stable | Delete course. |
| GET | `/api/courses/{id}/tree/` | Yes | Stable | Returns top-level tree nodes with prefetched children. |
| GET | `/api/courses/{id}/progress/` | Yes | Stable | Returns or creates user course progress. |
| POST | `/api/courses/{id}/enroll/` | Yes | Stable | Creates enrollment progress if missing. |

### 3.4 Lessons

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/lessons/` | Yes | Stable | Read-only list endpoint. |
| GET | `/api/lessons/{id}/` | Yes | Stable | Read-only detail endpoint. |
| POST | `/api/lessons/{id}/complete/` | Yes | Partial | Depends on lesson completion method and full progress workflow. |
| GET | `/api/lessons/{id}/render/` | Yes | Partial | Depends on lesson rendering implementation details. |

### 3.5 Challenges

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/challenges/` | Yes | Stable | Supports `status`, `difficulty`, `category`, `search`. |
| POST | `/api/challenges/` | Yes | Stable | Create challenge. |
| GET | `/api/challenges/{id}/` | Yes | Stable | Challenge detail. |
| PUT/PATCH | `/api/challenges/{id}/` | Yes | Stable | Update challenge. |
| DELETE | `/api/challenges/{id}/` | Yes | Stable | Delete challenge. |
| POST | `/api/challenges/{id}/submit_flag/` | Yes | Stable | Validates flag server-side and records submission. |
| POST | `/api/challenges/{id}/create_instance/` | Yes | Partial | Depends on instance deployment backend/runtime readiness. |

### 3.6 Quizzes

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/quizzes/` | Yes | Stable | List quizzes. |
| POST | `/api/quizzes/` | Yes | Stable | Create quiz. |
| GET | `/api/quizzes/{id}/` | Yes | Stable | Quiz detail with nested data serializer. |
| PUT/PATCH | `/api/quizzes/{id}/` | Yes | Stable | Update quiz. |
| DELETE | `/api/quizzes/{id}/` | Yes | Stable | Delete quiz. |
| POST | `/api/quizzes/{id}/start_attempt/` | Yes | Stable | Creates quiz attempt. |
| POST | `/api/quizzes/{id}/submit_answer/` | Yes | Partial | Depends on complete scoring/session persistence flow. |

### 3.7 Notifications

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/notifications/` | Yes | Stable | Current user + broadcast notifications. |
| GET | `/api/notifications/{id}/` | Yes | Stable | Notification detail. |
| POST | `/api/notifications/{id}/mark_read/` | Yes | Stable | Marks notification as read. |

### 3.8 Leaderboard

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/leaderboard/` | Yes | Partial | Service exists; broader statistics slice still pending. |

### 3.9 System Config

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/system-config/` | Admin | Stable | Admin-only list. |
| GET | `/api/system-config/{id}/` | Admin | Stable | Admin-only detail. |

Notes:
- Router currently exposes `ReadOnlyModelViewSet` actions for System Config.
- `PATCH` update is planned by slice and not active yet in current route set.

---

## 4. Planned APIs (Not Implemented Yet)

These contracts are planned by slices and PRDs, but are not active in the current backend routing.

### 4.1 Slice 1 — Authentication

- `POST /api/auth/change-password/`
- `POST /api/auth/reset-password/`
- `POST /api/auth/reset-password/confirm/`
- `GET /api/auth/sessions/`
- `POST /api/auth/sessions/{id}/revoke/`

### 4.2 Slice 2 — Authorization/RBAC

- `GET /api/admin/permissions/`
- `GET /api/admin/roles/`
- `POST /api/admin/roles/`
- `GET /api/admin/roles/{id}/permissions/`
- `POST /api/admin/roles/{id}/permissions/`

### 4.3 Slice 3+ Domain APIs

- Additional Learn tree management endpoints
- Additional Challenge node/category endpoints
- Quiz WebSocket/attempt lifecycle endpoints
- Admin statistics endpoints

---

## 5. Deferred APIs

### Slice 10 — AI Assistant

Deferred by project decision. Do not treat as active API.

- Candidate route family: `/api/ai/*`
- Current backend root router does not activate AI URLs.

---

## 6. Error and Security Notes

- Error payload shape is currently endpoint-dependent and will be normalized in later slices.
- Do not expose secret config values in clear text when config update APIs become writable.
- API documentation must be updated in the same session whenever endpoint routing or serializer contract changes.

---

## 7. Change Control

When endpoint behavior changes:
1. Update this file first (`docs/API.md`).
2. Reconcile progress state in `docs/STATUS.md`.
3. If scope or sequencing changes, update `docs/IMPL_PLAN.md`.
4. If document dependencies change, update `AGENT.md`.
