# API.md — ILS v2 API Reference

> Canonical API reference for the current implementation progress.
> Last updated: 2026-04-01

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
| GET | `/api/courses/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| POST | `/api/courses/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| GET | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| PUT/PATCH | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| DELETE | `/api/courses/{id}/` | Yes | Partial | Runtime route exists; full Slice 5 contract and frontend flow are still pending. |
| GET | `/api/courses/{id}/tree/` | Yes | Partial | Runtime route exists; tree integrity rules for full Slice 5 scope are pending. |
| GET | `/api/courses/{id}/progress/` | Yes | Partial | Runtime route exists; full progress-signal contract is pending. |
| POST | `/api/courses/{id}/enroll/` | Yes | Partial | Runtime route exists; full Slice 5 enrollment/progress contract is pending. |

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
| GET | `/api/challenges/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| POST | `/api/challenges/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| GET | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| PUT/PATCH | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| DELETE | `/api/challenges/{id}/` | Yes | Partial | Runtime route exists; full Slice 6 business rules are pending. |
| POST | `/api/challenges/{id}/submit_flag/` | Yes | Partial | Runtime route exists; full Slice 6 verification/workflow contract is pending. |
| POST | `/api/challenges/{id}/create_instance/` | Yes | Partial | Depends on instance deployment backend/runtime readiness. |

### 3.6 Quizzes

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/api/quizzes/` | Yes | Partial | Runtime route exists; full Slice 7 lifecycle contract is pending. |
| POST | `/api/quizzes/` | Yes | Partial | Runtime route exists; full Slice 7 lifecycle contract is pending. |
| GET | `/api/quizzes/{id}/` | Yes | Partial | Runtime route exists; full Slice 7 lifecycle contract is pending. |
| PUT/PATCH | `/api/quizzes/{id}/` | Yes | Partial | Runtime route exists; full Slice 7 lifecycle contract is pending. |
| DELETE | `/api/quizzes/{id}/` | Yes | Partial | Runtime route exists; full Slice 7 lifecycle contract is pending. |
| POST | `/api/quizzes/{id}/start_attempt/` | Yes | Partial | Runtime route exists; full scoring/session lifecycle is pending. |
| POST | `/api/quizzes/{id}/submit_answer/` | Yes | Partial | Depends on complete scoring/session persistence flow. |

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
| GET | `/api/admin/config/` | Admin | Stable | Admin-only list grouped by `category`; secret values are masked as `***`. |
| GET | `/api/admin/config/{key}/` | Admin | Stable | Admin-only detail lookup by config key (supports dotted keys). |
| PATCH | `/api/admin/config/{key}/` | Admin | Stable | Admin-only value update with type validation (`bool`, `int`, `string`, `json`, `secret`). |

Notes:
- `PATCH` returns `403` with `{"detail": "Config is not editable"}` when `is_editable=false`.
- Invalid payload type for config `value_type` returns `400` with deterministic validation error.
- Cache for non-runtime config reads is invalidated after successful updates.

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
- JWT claims contract for permission checks: `permissions` (base64 bitmap) + `pv` (permission version).
- Endpoint role grant contract: class-level default grant with explicit handler-level decorator overrides.

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
- System Config secret values are masked in API responses and are never returned in clear text.
- API documentation must be updated in the same session whenever endpoint routing or serializer contract changes.

---

## 7. Change Control

When endpoint behavior changes:
1. Update this file first (`docs/API.md`).
2. Reconcile progress state in `docs/STATUS.md`.
3. If scope or sequencing changes, update `docs/IMPL_PLAN.md`.
4. If document dependencies change, update `AGENT.md`.
